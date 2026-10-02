import { KeystrokeRecorderCore } from "./keystroke-capture.js";
import { parseParams, safeImageUrl } from "./params.js";

const P = parseParams(location.search);
// Inside a Telegram Mini App: close the webview when done. Launch data (initData) can be missing
// after a cross-origin redirect, so a known platform or the native bridge also counts.
const webApp = window.Telegram && window.Telegram.WebApp;
const tg = webApp && (webApp.initData || (webApp.platform && webApp.platform !== "unknown") || window.TelegramWebviewProxy)
  ? webApp : null;
if (tg) { tg.ready(); tg.expand(); }
const $ = (id) => document.getElementById(id);
const IDLE_GAP_MS = 8000; // longer gaps do not count as active writing time
const IDLE_HINT_MS = 12000;
const BARS = 44;

const sections = ["start", "voice", "text", "done"];
const show = (name) => sections.forEach((s) => ($(s).hidden = s !== name));
const fmtTime = (s) => {
  const t = Math.max(0, Math.floor(s));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

$("startPrompt").textContent = P.mode === "text" ? P.textPrompt : P.voicePrompt;
$("voicePrompt").textContent = P.voicePrompt;
$("textPrompt").textContent = P.textPrompt;
const imageUrl = safeImageUrl(P.image);
const showImages = () => {
  // The picture only appears once the participant has started, like the original task.
  for (const id of ["voiceImg", "textImg"]) {
    if (imageUrl) { $(id).src = imageUrl; $(id).hidden = false; }
  }
};

// ---------- completion ----------
let pending = null; // { kind: "voice"|"text", ... } kept so a failed send can be retried

function emit(summary, trial) {
  if (window.parent === window) return;
  if (P.embed) {
    try {
      window.parent.postMessage(
        { type: "m2c2:complete", assessment: "reflection", summary, data: { trials: [trial] } }, "*");
    } catch (e) { console.warn("[reflection] postMessage failed", e); }
  }
  window.parent.postMessage({ type: "NOVEL_COMPLETE", assessment: "reflection", data: trial }, "*");
}

async function send(result) {
  pending = result;
  $("sendError").hidden = true;
  $("retry").hidden = true;
  show("done");
  if (!P.callbackUrl) { offerDownloads(result); finish(result); return; }
  try {
    const resp = result.kind === "voice"
      ? await fetch(P.callbackUrl, {
          method: "POST",
          headers: { "Content-Type": result.blob.type, "X-Duration": String(result.duration), "X-Token": P.token },
          body: result.blob,
        })
      : await fetch(P.callbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: P.token, data: result.trial }),
        });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    finish(result);
  } catch (e) {
    console.warn("[reflection] send failed", e);
    $("doneMsg").textContent = "Your answer has not been sent yet.";
    $("sendError").textContent = "Sending failed. Check your connection and try again.";
    $("sendError").hidden = false;
    $("retry").hidden = false;
  }
}

function finish(result) {
  $("doneMsg").textContent = "Thank you. You can return to the app.";
  emit(result.summary, result.trial);
  if (!P.callbackUrl) return;
  if (tg) { setTimeout(() => tg.close(), 800); return; }
  // Inside the host's launch page (iframe) the host closes the Mini App; never navigate the frame.
  if (P.returnUrl && window.parent === window) {
    // Not a Mini App (e.g. opened in a browser): offer the way back and follow it.
    const a = document.createElement("a");
    a.className = "dl"; a.href = P.returnUrl; a.textContent = "Return to Telegram";
    $("downloads").replaceChildren(a);
    setTimeout(() => { location.href = P.returnUrl; }, 1500);
  }
}

function offerDownloads(result) {
  const box = $("downloads");
  box.textContent = "";
  const add = (blob, name, label) => {
    const a = document.createElement("a");
    a.className = "dl"; a.href = URL.createObjectURL(blob); a.download = name; a.textContent = label;
    box.append(a, document.createElement("br"));
  };
  if (result.kind === "voice") add(result.blob, `reflection.${result.blob.type.includes("mp4") ? "m4a" : "webm"}`, "Download recording");
  else {
    add(new Blob([result.csv], { type: "text/csv" }), "keystrokes.csv", "Download keystroke log");
    add(new Blob([result.trial.transcript], { type: "text/plain" }), "answer.txt", "Download answer text");
  }
}
$("retry").onclick = () => pending && send(pending);

// ---------- voice ----------
const voice = {
  stream: null, ctx: null, analyser: null, rec: null, chunks: [], tick: null,
  accum: 0, startedAt: null, status: "idle", blob: null, url: null, bars: new Array(BARS).fill(0),
};

function pickMime() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg;codecs=opus"]
    .find((t) => MediaRecorder.isTypeSupported(t)) || "";
}
const voiceElapsed = () => (voice.accum + (voice.startedAt != null ? Date.now() - voice.startedAt : 0)) / 1000;

function drawWave() {
  const c = $("wave");
  const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth, h = c.clientHeight;
  if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
  const g = c.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--primary");
  const step = w / BARS;
  voice.bars.forEach((a, i) => {
    const bh = Math.max(4, a * h);
    g.fillRect(i * step + step * 0.25, (h - bh) / 2, step * 0.5, bh);
  });
}

function sampleWave() {
  let amp = 0;
  if (voice.analyser) {
    const buf = new Uint8Array(voice.analyser.fftSize);
    voice.analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (const b of buf) sum += ((b - 128) / 128) ** 2;
    amp = Math.min(1, Math.sqrt(sum / buf.length) * 3.2);
  }
  voice.bars = [...voice.bars.slice(1), amp];
  drawWave();
}

function releaseMedia() {
  clearInterval(voice.tick); voice.tick = null;
  try { if (voice.rec && voice.rec.state !== "inactive") voice.rec.stop(); } catch { /* already stopped */ }
  voice.stream?.getTracks().forEach((t) => t.stop());
  voice.stream = null;
  try { void voice.ctx?.close(); } catch { /* ignore */ }
  voice.ctx = null; voice.analyser = null;
}

function voiceError(msg) { $("voiceError").textContent = msg; $("voiceError").hidden = !msg; }

async function startRecording() {
  voiceError("");
  showVoiceUi("recording");
  try {
    voice.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AC = window.AudioContext || window.webkitAudioContext;
    voice.ctx = new AC();
    voice.analyser = voice.ctx.createAnalyser();
    voice.analyser.fftSize = 256;
    voice.ctx.createMediaStreamSource(voice.stream).connect(voice.analyser);
    const mime = pickMime();
    voice.rec = new MediaRecorder(voice.stream, mime ? { mimeType: mime } : undefined);
    voice.chunks = [];
    voice.rec.ondataavailable = (e) => { if (e.data && e.data.size) voice.chunks.push(e.data); };
    voice.rec.start();
    voice.accum = 0; voice.startedAt = Date.now();
    voice.bars = new Array(BARS).fill(0);
    voice.tick = setInterval(() => {
      if (voice.status !== "recording") return;
      sampleWave();
      const s = voiceElapsed();
      $("timer").textContent = fmtTime(s);
      if (s >= P.maxSeconds) stopRecording();
    }, 90);
  } catch (e) {
    releaseMedia();
    const denied = e && (e.name === "NotAllowedError" || e.name === "SecurityError");
    showVoiceUi("idle");
    voiceError(denied
      ? "Microphone access is needed to record. Allow it in your browser and try again, or write instead."
      : "Recording isn't available on this device or browser. You can write instead.");
    $("stop").hidden = true; $("pause").textContent = "Try again"; $("pause").hidden = false;
    $("pause").onclick = () => { $("stop").hidden = false; $("pause").onclick = togglePause; $("pause").textContent = "Pause"; startRecording(); };
  }
}

function showVoiceUi(status) {
  voice.status = status;
  const review = status === "review";
  $("timerWrap").classList.toggle("rec", status === "recording");
  $("voiceControls").hidden = review;
  $("reviewControls").hidden = !review;
  $("player").hidden = !review;
  $("wave").hidden = review;
  $("voiceHint").textContent = review
    ? "Listen back, then Save, or Redo to record again."
    : "Tap Stop when you are done. You can listen back before saving.";
}

function togglePause() {
  if (!voice.rec) return;
  if (voice.status === "recording") {
    voice.accum = voiceElapsed() * 1000; voice.startedAt = null;
    try { if (voice.rec.state === "recording") voice.rec.pause(); } catch { /* UI still freezes */ }
    voice.status = "paused"; $("pause").textContent = "Resume"; $("timerWrap").classList.remove("rec");
  } else if (voice.status === "paused") {
    voice.startedAt = Date.now();
    try { if (voice.rec.state === "paused") voice.rec.resume(); } catch { /* ignore */ }
    voice.status = "recording"; $("pause").textContent = "Pause"; $("timerWrap").classList.add("rec");
  }
}

function stopRecording() {
  if (!voice.rec || (voice.status !== "recording" && voice.status !== "paused")) return;
  const dur = voiceElapsed();
  clearInterval(voice.tick);
  voice.rec.onstop = () => {
    voice.blob = new Blob(voice.chunks, { type: voice.rec.mimeType || "audio/webm" });
    voice.duration = dur;
    releaseMedia();
    if (voice.url) URL.revokeObjectURL(voice.url);
    voice.url = URL.createObjectURL(voice.blob);
    $("player").src = voice.url;
    $("timer").textContent = fmtTime(dur);
    showVoiceUi("review");
  };
  if (voice.rec.state !== "inactive") voice.rec.stop(); else voice.rec.onstop();
}

function saveVoice() {
  if (!voice.blob) return;
  const duration = Math.round(voice.duration * 10) / 10;
  const trial = { mode: "voice", duration_s: duration, mime_type: voice.blob.type, size_bytes: voice.blob.size };
  send({ kind: "voice", blob: voice.blob, duration, trial, summary: { n_trials: 1, mode: "voice", duration_s: duration } });
}

$("pause").onclick = togglePause;
$("stop").onclick = stopRecording;
$("redo").onclick = () => { if (voice.url) { URL.revokeObjectURL(voice.url); voice.url = null; } $("player").removeAttribute("src"); startRecording(); };
$("save").onclick = saveVoice;

function openVoice() {
  show("voice"); showImages();
  $("timer").textContent = "00:00";
  startRecording();
}

// ---------- text ----------
const core = new KeystrokeRecorderCore();
let typed = { active: 0, last: null, hasText: false, started: null, bound: false };

function bindTextarea() {
  if (typed.bound) return;
  typed.bound = true;
  const ta = $("area");
  const ts = (e) => (e.timeStamp > 0 ? e.timeStamp : performance.now());
  ta.addEventListener("keydown", (e) => core.onKeyDown({ key: e.key, code: e.code, keyCode: e.keyCode, timeStamp: ts(e), isComposing: e.isComposing, repeat: e.repeat }));
  ta.addEventListener("keyup", (e) => core.onKeyUp({ key: e.key, code: e.code, keyCode: e.keyCode, timeStamp: ts(e), isComposing: e.isComposing }));
  ta.addEventListener("beforeinput", (e) => core.onBeforeInput({ inputType: e.inputType, data: e.data, timeStamp: ts(e) }));
  ta.addEventListener("focus", (e) => core.onFocus(ts(e)));
  ta.addEventListener("blur", (e) => core.onBlur(ts(e)));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) core.onBlur(performance.now());
    else if (document.activeElement === ta) core.onFocus(performance.now());
  });
  ta.addEventListener("input", () => {
    const now = performance.now();
    if (typed.started == null) typed.started = now;
    if (typed.last != null) typed.active += Math.min(now - typed.last, IDLE_GAP_MS);
    typed.last = now;
    const has = ta.value.trim().length > 0;
    if (has !== typed.hasText) { typed.hasText = has; $("submitText").disabled = !has; }
  });
  setInterval(() => {
    if ($("text").hidden) return;
    const target = P.targetSeconds * 1000;
    const frac = Math.min(1, typed.active / target);
    $("progress").style.width = `${Math.round(frac * 100)}%`;
    const idle = typed.last != null && performance.now() - typed.last > IDLE_HINT_MS && frac < 1;
    $("textHint").textContent = idle
      ? "Still with you? Keep writing whatever comes to mind, no need for polish."
      : frac >= 1 ? "That's plenty. Finish whenever you're ready, or keep going."
        : `Try to keep writing continuously for about ${Math.round(P.targetSeconds / 60) || 1} minute${P.targetSeconds >= 90 ? "s" : ""}.`;
  }, 500);
}

function openText() {
  releaseMedia();
  show("text"); showImages();
  bindTextarea();
  $("area").focus();
}

function submitText() {
  const transcript = $("area").value;
  if (!transcript.trim()) return;
  const { csv, captureMode } = core.finish(transcript);
  const activeS = Math.round(typed.active / 100) / 10;
  const trial = {
    mode: "text", transcript, keystroke_csv: csv, capture_mode: captureMode,
    active_writing_s: activeS, n_chars: transcript.length,
  };
  send({
    kind: "text", csv, trial,
    summary: { n_trials: 1, mode: "text", n_chars: transcript.length, active_writing_s: activeS, capture_mode: captureMode },
  });
}
$("submitText").onclick = submitText;

// ---------- navigation ----------
$("chooseVoice").onclick = openVoice;
$("chooseText").onclick = openText;
$("voiceToText").onclick = openText;
$("textToVoice").onclick = openVoice;
window.addEventListener("pagehide", releaseMedia);

const voiceOnly = P.mode === "voice";
const textOnly = P.mode === "text";
$("chooseText").hidden = voiceOnly;
$("voiceToText").hidden = voiceOnly;
$("chooseVoice").hidden = textOnly;
$("textToVoice").hidden = textOnly;
if (P.mode === "choice") show("start");
else if (textOnly) openText();
else openVoice(); // voice and voice_first (the latter keeps the "Write instead" button)

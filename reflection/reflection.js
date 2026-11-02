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

// Like the PWA sheet: a short first line is the title, the rest is the compact instruction text.
function splitPrompt(prompt) {
  const lines = prompt.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1 && lines[0].length <= 60) return { title: lines[0], detail: lines.slice(1).join("\n\n") };
  return { title: "Daily reflection", detail: prompt };
}
const SPLIT = splitPrompt(P.mode === "text" ? P.textPrompt : P.voicePrompt);
document.title = SPLIT.title;
$("title").textContent = SPLIT.title;
$("startPrompt").textContent = SPLIT.detail;
$("voicePrompt").textContent = splitPrompt(P.voicePrompt).detail;
$("textPrompt").textContent = splitPrompt(P.textPrompt).detail;
const ICON = {
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z"/></svg>',
};
const setCenter = (icon, label) => { $("pause").innerHTML = ICON[icon]; $("pause").setAttribute("aria-label", label); };
const imageUrl = safeImageUrl(P.image);
const showImages = () => {
  // The picture only appears once the participant has started, like the original task.
  for (const id of ["voiceImg", "textImg"]) {
    if (imageUrl) { $(id).src = imageUrl; $(id).hidden = false; $("voiceSpacer").hidden = true; }
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
  const css = getComputedStyle(document.documentElement);
  const primary = css.getPropertyValue("--primary"), line = css.getPropertyValue("--line");
  const review = voice.status === "review";
  const playedBars = review && voice.duration > 0 ? Math.round(Math.min(1, ($("player").currentTime || 0) / voice.duration) * BARS) : 0;
  const step = w / BARS;
  voice.bars.forEach((a, i) => {
    const bh = Math.max(4, a * h);
    const live = voice.status === "recording" || voice.status === "paused";
    g.globalAlpha = live ? 0.55 + a * 0.45 : review ? (i < playedBars ? 1 : 0.5) : 0.4;
    g.fillStyle = live || (review && i < playedBars) ? primary : line;
    g.beginPath();
    g.roundRect ? g.roundRect(i * step + step * 0.2, (h - bh) / 2, step * 0.6, bh, step * 0.3) : g.rect(i * step + step * 0.2, (h - bh) / 2, step * 0.6, bh);
    g.fill();
  });
  g.globalAlpha = 1;
}

// Browsers keep an AudioContext "suspended" until a tap inside this page, and voice_first starts
// recording without one (inside the host's iframe the host's tap does not count). Recording itself
// is unaffected; only the level meter needs the context running.
function resumeAudio() {
  if (voice.ctx && voice.ctx.state === "suspended") voice.ctx.resume().catch(() => { /* needs a tap */ });
}
for (const ev of ["pointerdown", "touchstart", "keydown", "click"]) {
  document.addEventListener(ev, resumeAudio, { passive: true });
}

function sampleWave() {
  const waiting = voice.ctx && voice.ctx.state === "suspended";
  if (waiting) resumeAudio();
  if (voice.status === "recording") {
    $("voiceHint").textContent = waiting
      ? "Recording. Tap anywhere to show the sound level."
      : "Tap Stop when you are done. You can listen back before saving.";
  }
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
    resumeAudio();
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
    $("begin").textContent = "Try again";
  }
}

function showVoiceUi(status) {
  voice.status = status;
  const review = status === "review";
  const idle = status === "idle";
  $("timerWrap").classList.toggle("rec", status === "recording");
  $("idleControls").hidden = !idle;
  $("begin").hidden = !idle;
  $("voiceControls").hidden = idle;
  $("stop").hidden = review;
  $("save").hidden = !review;
  $("total").hidden = !review;
  if (review) setCenter("play", "Play recording");
  else if (!idle) setCenter("pause", "Pause");
  drawWave();
  $("voiceHint").textContent = review
    ? "You can play your recording back before saving, or Redo to record again."
    : idle
      ? "Tap Start recording. Your browser will ask to use the microphone."
      : "Tap Stop when you are done. You can listen back before saving.";
}

function togglePause() {
  if (!voice.rec) return;
  if (voice.status === "recording") {
    voice.accum = voiceElapsed() * 1000; voice.startedAt = null;
    try { if (voice.rec.state === "recording") voice.rec.pause(); } catch { /* UI still freezes */ }
    voice.status = "paused"; setCenter("mic", "Resume"); $("timerWrap").classList.remove("rec");
  } else if (voice.status === "paused") {
    voice.startedAt = Date.now();
    try { if (voice.rec.state === "paused") voice.rec.resume(); } catch { /* ignore */ }
    voice.status = "recording"; setCenter("pause", "Pause"); $("timerWrap").classList.add("rec");
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
    $("timer").textContent = fmtTime(0);
    $("total").textContent = ` / ${fmtTime(dur)}`;
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

function playPause() {
  const a = $("player");
  if (a.paused) { if (a.ended || a.currentTime >= voice.duration) a.currentTime = 0; a.play().catch(() => { /* needs a tap */ }); setCenter("pause", "Pause playback"); }
  else { a.pause(); setCenter("play", "Play recording"); }
}
$("player").addEventListener("timeupdate", () => { $("timer").textContent = fmtTime($("player").currentTime); drawWave(); });
$("player").addEventListener("ended", () => { setCenter("play", "Play recording"); $("timer").textContent = fmtTime(voice.duration); drawWave(); });
$("pause").onclick = () => (voice.status === "review" ? playPause() : togglePause());
$("stop").onclick = stopRecording;
$("redo").onclick = () => { $("player").pause(); if (voice.url) { URL.revokeObjectURL(voice.url); voice.url = null; } $("player").removeAttribute("src"); startRecording(); };
$("save").onclick = saveVoice;

// `armed`: wait for a tap on "Start recording". Recording started from a tap inside this page gets
// a running AudioContext (the waveform) and a reliable microphone prompt; starting on page load
// does not, which is why the page opens straight into voice mode armed rather than recording.
function openVoice(armed = false) {
  show("voice"); showImages();
  $("timer").textContent = "00:00";
  if (armed === true) { showVoiceUi("idle"); $("begin").textContent = "Start recording"; return; }
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
    const timeFrac = Math.min(1, typed.active / target);
    const lenFrac = P.minChars > 0 ? Math.min(1, $("area").value.trim().length / P.minChars) : 1;
    const frac = Math.min(timeFrac, lenFrac);
    const lengthShort = timeFrac >= 1 && lenFrac < 1;
    $("progress").style.width = `${Math.round(frac * 100)}%`;
    const idle = typed.last != null && performance.now() - typed.last > IDLE_HINT_MS && frac < 1;
    $("textHint").textContent = idle
      ? "Still with you? Keep writing whatever comes to mind \u2014 no need for polish."
      : frac >= 1 ? "That's plenty \u2014 finish whenever you're ready, or keep going."
        : lengthShort ? "Almost there \u2014 a few more sentences will do."
          : `Try to keep writing continuously for about ${P.targetSeconds >= 90 ? "two minutes" : "a minute"}.`;
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
$("chooseVoice").onclick = () => openVoice();
$("chooseText").onclick = openText;
$("voiceToText").onclick = openText;
$("textToVoice").onclick = () => openVoice();
$("begin").onclick = () => { $("begin").textContent = "Start recording"; startRecording(); };
window.addEventListener("pagehide", releaseMedia);

const voiceOnly = P.mode === "voice";
const textOnly = P.mode === "text";
$("chooseText").hidden = voiceOnly;
$("voiceToText").hidden = voiceOnly;
$("chooseVoice").hidden = textOnly;
$("textToVoice").hidden = textOnly;
if (P.mode === "choice") show("start");
else if (textOnly) openText();
else openVoice(true); // voice and voice_first (the latter keeps the "Write instead" button)

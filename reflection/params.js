/** URL parameters for the reflection task (all optional). */

/**
 * voice_first  opens the voice recorder straight away, with a "Write instead" fallback (default)
 * choice       start screen offering both
 * voice        audio only, no written fallback
 * text         writing only
 */
export const MODES = ["voice_first", "choice", "voice", "text"];

export const DEFAULTS = {
  mode: "voice_first",
  voicePrompt:
    "Talk about your day today. Try to talk without stopping for about 2 minutes, about whatever " +
    "comes to mind, as if you were sharing with a friend. Do not worry about pauses or having the " +
    "right things to say.",
  textPrompt:
    "Write about your day today. Try to write without stopping for about 2 minutes, about whatever " +
    "comes to mind, as if you were sharing with a friend. Do not worry about typos or pauses.",
  maxSeconds: 300,
  targetSeconds: 120,
};

function positiveInt(value, fallback) {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * mode            choice | voice_first | voice | text (default voice_first; see MODES)
 * prompt          instruction text shown above the recorder (plain text, never HTML)
 * image           optional image URL, shown only once the participant starts
 * max_seconds     voice recording cap (default 300)
 * target_seconds  typed "keep writing" nudge target, in active-writing seconds (default 120)
 * callback_url    where to POST the result; token is sent with it
 * token           opaque id echoed back to the callback
 * embed           1 = also emit the m2c2 `m2c2:complete` message to the parent frame
 */
export function parseParams(search) {
  const q = new URLSearchParams(search);
  const rawMode = q.get("mode");
  const mode = MODES.includes(rawMode) ? rawMode : DEFAULTS.mode;
  const prompt = (q.get("prompt") || "").trim();
  return {
    mode,
    voicePrompt: prompt || DEFAULTS.voicePrompt,
    textPrompt: prompt || DEFAULTS.textPrompt,
    image: q.get("image") || "",
    maxSeconds: positiveInt(q.get("max_seconds"), DEFAULTS.maxSeconds),
    targetSeconds: positiveInt(q.get("target_seconds"), DEFAULTS.targetSeconds),
    callbackUrl: q.get("callback_url") || "",
    token: q.get("token") || "",
    embed: q.get("embed") === "1",
  };
}

/** Only http(s) image URLs are rendered. */
export function safeImageUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}

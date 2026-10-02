/**
 * Privacy-preserving keystroke-dynamics recorder (ported from the ESMira PWA).
 *
 * The literal characters are NEVER put in the log. Every key is bucketed into a character
 * *class* at capture time; only the class and timings are logged. The typed answer itself is
 * handed to `finish()` separately.
 *
 * Two capture paths keep inter-key intervals, correction rate and pause structure available
 * on every platform:
 *   - physical keyboard: keydown/keyup -> full rows incl. hold time (release - press).
 *   - soft keyboard (keyCode 229, key "Unidentified"/"Process", or no keydown at all):
 *     `beforeinput` -> press-only rows; hold/release left blank.
 * Focus loss and paste emit marker rows so analysis never treats away-time or a paste as an
 * inter-key interval.
 *
 * The log is a self-describing CSV `class,hold,release,press` (seconds from t0 = first
 * observed event). Handlers take plain event-like objects so this is unit-testable in Node.
 */

const NAV_KEYS = new Set([
  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown",
]);
const MODIFIER_KEYS = new Set([
  "Shift", "Control", "Alt", "AltGraph", "Meta", "CapsLock", "Fn", "FnLock",
]);

/** Bucket a key label into a class without retaining the character. */
export function classifyKey(key) {
  if (key === "Backspace") return "backspace";
  if (key === "Delete") return "delete";
  if (key === " " || key === "Spacebar" || key === "Enter" || key === "Tab") return "whitespace";
  if (NAV_KEYS.has(key)) return "navigation";
  if (MODIFIER_KEYS.has(key)) return "modifier";
  if (key.length === 1) {
    if (/[0-9]/.test(key)) return "digit";
    if (/\p{L}/u.test(key)) return "letter";
    return "punctuation";
  }
  return "other";
}

/** Classify a soft-keyboard `beforeinput` from its inputType/data (null = ignore). */
export function classifyInput(inputType, data) {
  switch (inputType) {
    case "insertText":
      if (data == null || data.length === 0) return null;
      return data.length === 1 ? classifyKey(data) : "other"; // autocomplete / IME commit
    case "insertLineBreak":
    case "insertParagraph":
      return "whitespace";
    case "deleteContentBackward":
    case "deleteWordBackward":
    case "deleteSoftLineBackward":
      return "backspace";
    case "deleteContentForward":
    case "deleteWordForward":
      return "delete";
    case "insertFromPaste":
    case "insertFromPasteAsQuotation":
      return "paste";
    default:
      return "other";
  }
}

const round3 = (n) => Math.round(n * 1000) / 1000;
const fmt = (n) => (n == null ? "" : String(round3(n)));

export class KeystrokeRecorderCore {
  constructor() {
    this.rows = [];
    this.pending = new Map(); // held keydowns awaiting a keyup, by event.code
    this.t0 = null;
    this.lastKeydownUsable = false;
    this.physicalUsed = false;
    this.softUsed = false;
    this.focused = false;
  }

  rel(timeStamp) {
    if (this.t0 == null) this.t0 = timeStamp;
    const s = (timeStamp - this.t0) / 1000;
    return s < 0 ? 0 : s;
  }

  isUsablePhysical(e) {
    if (e.isComposing) return false;
    if (e.keyCode === 229) return false;
    return e.key !== "Unidentified" && e.key !== "Process" && e.key !== "";
  }

  onFocus(timeStamp) {
    if (this.focused) return;
    this.focused = true;
    this.rows.push({ cls: "focus_gained", press: this.rel(timeStamp), release: null, hold: null });
  }

  onBlur(timeStamp) {
    if (!this.focused) return;
    this.focused = false;
    this.pending.clear(); // away-time must never become a bogus hold
    this.lastKeydownUsable = false;
    this.rows.push({ cls: "focus_lost", press: this.rel(timeStamp), release: null, hold: null });
  }

  onKeyDown(e) {
    if (e.repeat) return;
    if (!this.isUsablePhysical(e)) {
      this.lastKeydownUsable = false; // the soft path handles it via beforeinput
      return;
    }
    this.lastKeydownUsable = true;
    this.pending.set(e.code, { cls: classifyKey(e.key), press: this.rel(e.timeStamp) });
  }

  onKeyUp(e) {
    this.lastKeydownUsable = false;
    const down = this.pending.get(e.code);
    if (!down) return;
    this.pending.delete(e.code);
    const release = this.rel(e.timeStamp);
    this.rows.push({ cls: down.cls, press: down.press, release, hold: round3(release - down.press) });
    this.physicalUsed = true;
  }

  onBeforeInput(e) {
    const cls = classifyInput(e.inputType, e.data);
    if (cls === null) return;
    if (cls === "paste") {
      this.rows.push({ cls: "paste", press: this.rel(e.timeStamp), release: null, hold: null });
      return;
    }
    if (this.lastKeydownUsable) return; // the physical path already recorded this insertion
    this.rows.push({ cls, press: this.rel(e.timeStamp), release: null, hold: null });
    this.softUsed = true;
  }

  captureMode() {
    if (this.physicalUsed && this.softUsed) return "mixed";
    if (this.softUsed) return "soft";
    return "physical";
  }

  /** Flush keys still held (press-only), serialise the log and return it with the transcript. */
  finish(transcript) {
    for (const down of this.pending.values()) {
      this.rows.push({ cls: down.cls, press: down.press, release: null, hold: null });
    }
    this.pending.clear();
    const body = this.rows.map((r) => `${r.cls},${fmt(r.hold)},${fmt(r.release)},${fmt(r.press)}`);
    return {
      csv: ["class,hold,release,press", ...body].join("\n") + "\n",
      transcript,
      captureMode: this.captureMode(),
    };
  }
}

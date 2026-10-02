import test from "node:test";
import assert from "node:assert/strict";
import { KeystrokeRecorderCore, classifyInput, classifyKey } from "./keystroke-capture.js";

test("keys are bucketed into classes, never stored", () => {
  assert.equal(classifyKey("a"), "letter");
  assert.equal(classifyKey("é"), "letter");
  assert.equal(classifyKey("7"), "digit");
  assert.equal(classifyKey("!"), "punctuation");
  assert.equal(classifyKey(" "), "whitespace");
  assert.equal(classifyKey("Backspace"), "backspace");
  assert.equal(classifyKey("F5"), "other");
  assert.equal(classifyInput("insertFromPaste", "x"), "paste");
  assert.equal(classifyInput("insertText", null), null);
});

test("physical keyboard records hold times and never the characters", () => {
  const core = new KeystrokeRecorderCore();
  core.onFocus(1000);
  core.onKeyDown({ key: "s", code: "KeyS", keyCode: 83, timeStamp: 1100 });
  core.onBeforeInput({ inputType: "insertText", data: "s", timeStamp: 1101 });
  core.onKeyUp({ key: "s", code: "KeyS", keyCode: 83, timeStamp: 1180 });
  const { csv, captureMode } = core.finish("s");
  assert.equal(captureMode, "physical");
  assert.equal(csv, "class,hold,release,press\nfocus_gained,,,0\nletter,0.08,0.18,0.1\n");
});

test("soft keyboard falls back to beforeinput and marks paste/blur", () => {
  const core = new KeystrokeRecorderCore();
  core.onFocus(0);
  core.onKeyDown({ key: "Unidentified", code: "", keyCode: 229, timeStamp: 50 });
  core.onBeforeInput({ inputType: "insertText", data: "h", timeStamp: 51 });
  core.onBeforeInput({ inputType: "insertFromPaste", data: null, timeStamp: 900 });
  core.onBlur(1000);
  const { csv, captureMode } = core.finish("h");
  assert.equal(captureMode, "soft");
  assert.deepEqual(csv.trim().split("\n").slice(1).map((l) => l.split(",")[0]),
    ["focus_gained", "letter", "paste", "focus_lost"]);
});

test("a key held at finish is flushed press-only; blur drops dangling keydowns", () => {
  const a = new KeystrokeRecorderCore();
  a.onKeyDown({ key: "a", code: "KeyA", keyCode: 65, timeStamp: 10 });
  assert.match(a.finish("a").csv, /letter,,,0\n$/);
  const b = new KeystrokeRecorderCore();
  b.onFocus(0);
  b.onKeyDown({ key: "a", code: "KeyA", keyCode: 65, timeStamp: 10 });
  b.onBlur(20);
  assert.ok(!b.finish("").csv.includes("letter"));
});

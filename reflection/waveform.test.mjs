import test from "node:test";
import assert from "node:assert/strict";
import { binLevels, seekTime } from "./waveform.js";

test("binLevels takes the peak of each slice and scales to the loudest", () => {
  assert.deepEqual(binLevels([0.1, 0.5, 0.2, 0.25], 2), [1, 0.5]);
});

test("binLevels stretches short recordings and handles silence", () => {
  assert.deepEqual(binLevels([0.4], 3), [1, 1, 1]);
  assert.deepEqual(binLevels([], 3), [0, 0, 0]);
  assert.deepEqual(binLevels([0, 0], 2), [0, 0]);
});

test("binLevels covers every sample of a long recording", () => {
  const levels = new Array(1000).fill(0.1);
  levels[999] = 0.9; // the very end must still show up
  const bars = binLevels(levels, 44);
  assert.equal(bars.length, 44);
  assert.equal(bars[43], 1);
});

test("seekTime maps a tap to a clamped position", () => {
  assert.equal(seekTime(50, 200, 120), 30);
  assert.equal(seekTime(-5, 200, 120), 0);
  assert.equal(seekTime(250, 200, 120), 120);
  assert.equal(seekTime(10, 0, 120), 0);
});

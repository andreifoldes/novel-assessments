import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, parseParams, safeImageUrl } from "./params.js";

test("defaults", () => {
  const p = parseParams("");
  assert.equal(p.mode, "choice");
  assert.equal(p.maxSeconds, 300);
  assert.equal(p.targetSeconds, 120);
  assert.equal(p.voicePrompt, DEFAULTS.voicePrompt);
  assert.equal(p.embed, false);
});

test("overrides and sanitising", () => {
  const p = parseParams("?mode=text&prompt=Hi%20there&max_seconds=60&target_seconds=-5&embed=1&callback_url=https://x/y&token=t");
  assert.equal(p.mode, "text");
  assert.equal(p.textPrompt, "Hi there");
  assert.equal(p.maxSeconds, 60);
  assert.equal(p.targetSeconds, 120); // invalid -> default
  assert.deepEqual([p.embed, p.callbackUrl, p.token], [true, "https://x/y", "t"]);
  assert.equal(parseParams("?mode=bogus").mode, "choice");
});

test("only http(s) images are allowed", () => {
  assert.equal(safeImageUrl("javascript:alert(1)"), "");
  assert.equal(safeImageUrl("data:text/html,x"), "");
  assert.equal(safeImageUrl("not a url"), "");
  assert.equal(safeImageUrl("https://a.example/p.jpg"), "https://a.example/p.jpg");
});

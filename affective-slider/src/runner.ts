/**
 * Local development runner for the AffectiveSlider assessment.
 *
 * This file wraps AffectiveSliderGame in an m2c2kit Session for testing
 * in a browser. It is NOT included in the library build (see tsconfig.json).
 *
 * URL parameters are forwarded to the game as GameParameters, e.g.:
 *   ?orientation=vertical&randomize_order=true&show_labels=false
 *
 * Integration parameters (handled by this runner, not the game):
 *   ?callback_url=<url>&token=<token>  — POST results to URL on completion.
 */

import { Session } from "@m2c2kit/session";
import { AffectiveSliderGame } from "./index";

const game = new AffectiveSliderGame();

const urlParams = new URLSearchParams(window.location.search);

// Forward URL query parameters to the game (skip integration-only params)
const RUNNER_PARAMS = new Set(['callback_url', 'token']);
const gameParameters: Record<string, string> = {};
urlParams.forEach((value, key) => {
  if (!RUNNER_PARAMS.has(key)) gameParameters[key] = value;
});
game.setParameters(gameParameters);

const session = new Session({
  activities: [game],
});

session.onActivityData((ev) => {
  console.log("[AffectiveSlider] trial data:", JSON.stringify(ev.newData, null, 2));

  const callbackUrl = urlParams.get('callback_url');
  const token = urlParams.get('token');

  // Notify parent frame (PWA wrapper listens for this)
  const msg = { type: 'NOVEL_COMPLETE', assessment: 'affective-slider', data: ev.newData };
  if (window.parent !== window) {
    window.parent.postMessage(msg, '*');
  }

  if (callbackUrl && token) {
    fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, data: ev.newData }),
    }).catch(err => console.warn('[AffectiveSlider] Callback failed:', err));
  }
});

session.onEnd(() => {
  console.log("[AffectiveSlider] session complete.");
});

session.initialize();

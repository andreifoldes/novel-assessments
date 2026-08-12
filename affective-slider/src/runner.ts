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
 *   ?embed=1                           — emit the m2c2 `m2c2:complete` message
 *                                        to the parent frame (ESMira and other
 *                                        m2c2-style hosts consume this).
 *   ?callback_url=<url>&token=<token>  — POST results to URL on completion.
 */

import { Session } from "@m2c2kit/session";
import { AffectiveSliderGame } from "./index";

const game = new AffectiveSliderGame();

const urlParams = new URLSearchParams(window.location.search);

// Forward URL query parameters to the game (skip integration-only params).
// `embed`/`v` are host markers ESMira appends; `callback_url`/`token` drive the
// HTTP callback — none are declared AffectiveSliderParams, so forwarding them
// would trigger m2c2kit "unknown parameter" warnings.
const RUNNER_PARAMS = new Set(['callback_url', 'token', 'embed', 'v']);
const gameParameters: Record<string, string> = {};
urlParams.forEach((value, key) => {
  if (!RUNNER_PARAMS.has(key)) gameParameters[key] = value;
});
game.setParameters(gameParameters);

const session = new Session({
  activities: [game],
});

session.onActivityData((ev) => {
  const d = ev.newData as Record<string, unknown>; // AffectiveSliderTrialData
  console.log("[AffectiveSlider] trial data:", JSON.stringify(d, null, 2));

  const callbackUrl = urlParams.get('callback_url');
  const token = urlParams.get('token');
  const embed = urlParams.get('embed') === '1';

  if (window.parent !== window) {
    // Primary contract: the m2c2 `m2c2:complete` message that ESMira and other
    // m2c2-style hosts consume. `summary` lands in the cognitive question's own
    // column; `data.trials[]` becomes rows in the host's "Cognitive Trials" table.
    if (embed) {
      const rt = typeof d.response_time_ms === "number" ? d.response_time_ms : null;
      try {
        window.parent.postMessage(
          {
            type: "m2c2:complete",
            assessment: "affective-slider",
            summary: {
              n_trials: 1,
              pleasure_value: d.pleasure_value ?? null,
              arousal_value: d.arousal_value ?? null,
              duration_s: rt != null ? +(rt / 1000).toFixed(1) : null,
            },
            data: { trials: [d] },
          },
          "*",
        );
      } catch (e) {
        console.warn("[affective-slider] parent postMessage failed", e);
      }
    }

    // Legacy message, retained for other wrappers that listen for it.
    window.parent.postMessage(
      { type: "NOVEL_COMPLETE", assessment: "affective-slider", data: d },
      "*",
    );
  }

  if (callbackUrl && token) {
    fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, data: d }),
    }).catch(err => console.warn('[AffectiveSlider] Callback failed:', err));
  }
});

session.onEnd(() => {
  console.log("[AffectiveSlider] session complete.");
});

session.initialize();

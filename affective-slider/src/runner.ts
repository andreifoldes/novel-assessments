/**
 * Local development runner for the AffectiveSlider assessment.
 *
 * This file wraps AffectiveSliderGame in an m2c2kit Session for testing
 * in a browser. It is NOT included in the library build (see tsconfig.json).
 *
 * URL parameters are forwarded to the game as GameParameters, e.g.:
 *   ?orientation=vertical&randomize_order=true&show_labels=false
 */

import { Session } from "@m2c2kit/session";
import { AffectiveSliderGame } from "./index";

const game = new AffectiveSliderGame();

// Forward URL query parameters to the game
const urlParams = new URLSearchParams(window.location.search);
const gameParameters: Record<string, string> = {};
urlParams.forEach((value, key) => {
  gameParameters[key] = value;
});
game.setParameters(gameParameters);

const session = new Session({
  activities: [game],
});

session.onActivityData((ev) => {
  console.log("[AffectiveSlider] trial data:", JSON.stringify(ev.newData, null, 2));
});

session.onEnd(() => {
  console.log("[AffectiveSlider] session complete.");
});

session.initialize();

/**
 * Shared types for the AffectiveSlider m2c2kit assessment.
 */

/** Display orientation of the slider tracks. */
export type SliderOrientation = "horizontal" | "vertical";

/**
 * Configurable game parameters exposed to m2c2kit session runners.
 * These mirror the GameParameters schema declared in AffectiveSliderGame.
 */
export interface AffectiveSliderParams {
  /** Slider orientation: "horizontal" (original AS) or "vertical" (VAMS-style). */
  orientation: SliderOrientation;
  /** Randomize which slider (pleasure vs arousal) is presented first. */
  randomize_order: boolean;
  /** Show verbal labels ("Sad / Happy", "Sleepy / Wide Awake") beside the faces. */
  show_labels: boolean;
  /** Require the user to interact with both sliders before submitting. */
  require_both_interactions: boolean;
  /** Show FPS counter (dev only). */
  show_fps: boolean;
}

/**
 * Data recorded for a single completed rating.
 * All numeric values are normalized 0–1.
 */
export interface AffectiveSliderTrialData {
  /** Pleasure rating: 0 = most negative (sad), 1 = most positive (happy). */
  pleasure_value: number;
  /** Arousal rating: 0 = lowest (sleepy), 1 = highest (wide awake). */
  arousal_value: number;
  /** Whether the participant actually moved the pleasure slider. */
  pleasure_interacted: boolean;
  /** Whether the participant actually moved the arousal slider. */
  arousal_interacted: boolean;
  /** Position of the pleasure slider in the display order ("first" | "second"). */
  pleasure_slider_position: "first" | "second";
  /** Orientation used during the trial. */
  orientation: SliderOrientation;
  /** Milliseconds from scene appearance to first slider interaction. */
  first_interaction_ms: number | null;
  /** Milliseconds from scene appearance to submission. */
  response_time_ms: number;
}

/** Internal per-slider state tracked during a rating scene. */
export interface SliderState {
  value: number;         // 0–1
  interacted: boolean;
  firstInteractionMs: number | null;
}

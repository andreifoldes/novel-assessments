/**
 * AffectiveSlider — m2c2kit implementation
 *
 * A digital self-assessment scale measuring pleasure (valence) and arousal
 * on continuous normalized scales (0–1), following:
 *
 *   Betella & Verschure (2016) "The Affective Slider", PLoS ONE 11, e0148037
 *   Kontou et al. (2012) "Psychometric properties of a revised version of the
 *     Visual Analog Mood Scales", Arch Phys Med Rehabil.
 *
 * Design principles implemented:
 *   - Two simultaneous sliders: pleasure (sad → happy) and arousal (sleepy → wide awake)
 *   - Both start at center (0.5)
 *   - Greyscale color palette throughout
 *   - Emoticon faces at scale extremities
 *   - Flexible orientation: horizontal (original AS) or vertical (VAMS-style)
 *   - Randomizable presentation order (pleasure above/below arousal)
 *   - Submit disabled until user has interacted with both sliders
 */

import {
  Game,
  Scene,
  Label,
  Shape,
  Sprite,
  Action,
  WebColors,
  GameParameters,
  GameOptions,
  TrialSchema,
  Timer,
  Constants,
} from "@m2c2kit/core";
import { Button, Instructions, Slider } from "@m2c2kit/addons";
import { VerticalSlider } from "./VerticalSlider";
import type { SliderState } from "./types";

// ── Greyscale palette (AS spec: exclusively greyscale) ──────────────────────
const GREY_DARK: [number, number, number, number] = [60, 60, 60, 1];
const GREY_MID: [number, number, number, number] = [120, 120, 120, 1];
const GREY_LIGHT: [number, number, number, number] = [200, 200, 200, 1];
const GREY_BG: [number, number, number, number] = [248, 248, 248, 1];
const GREY_TRACK: [number, number, number, number] = [150, 150, 150, 1];
const WHITE: [number, number, number, number] = [255, 255, 255, 1];

/** Physical size of the canvas in logical pixels. Aspect ratio 9:16 (phone). */
const CANVAS_W = 360;
const CANVAS_H = 640;

/** Face image side length in logical pixels. */
const FACE_SIZE = 64;

/** Track length in logical pixels (≈100 mm at ~96 dpi; actual physical size
 *  depends on device DPI — canvaskit scales correctly on high-DPI screens). */
const TRACK_LENGTH = 200;

class AffectiveSliderGame extends Game {
  constructor() {
    const defaultParameters: GameParameters = {
      orientation: {
        type: "string",
        default: "horizontal",
        description:
          'Slider orientation. "horizontal" = original AS layout; "vertical" = VAMS-style.',
      },
      randomize_order: {
        type: "boolean",
        default: false,
        description:
          "Randomize which slider (pleasure vs arousal) appears first.",
      },
      show_labels: {
        type: "boolean",
        default: true,
        description:
          'Show verbal labels beside the faces (e.g. "Sad / Happy", "Sleepy / Wide Awake").',
      },
      require_both_interactions: {
        type: "boolean",
        default: true,
        description:
          "Require the user to interact with both sliders before the Submit button is enabled.",
      },
      show_fps: {
        type: "boolean",
        default: false,
        description: "Show frames-per-second counter (development only).",
      },
    };

    const trialSchema: TrialSchema = {
      pleasure_value: {
        type: "number",
        description:
          "Pleasure rating, normalized 0–1 (0 = most negative / sad, 1 = most positive / happy).",
      },
      arousal_value: {
        type: "number",
        description:
          "Arousal rating, normalized 0–1 (0 = lowest / sleepy, 1 = highest / wide awake).",
      },
      pleasure_interacted: {
        type: "boolean",
        description: "Did the participant move the pleasure slider?",
      },
      arousal_interacted: {
        type: "boolean",
        description: "Did the participant move the arousal slider?",
      },
      pleasure_slider_position: {
        type: "string",
        description:
          'Position of the pleasure slider in the display order ("first" or "second").',
      },
      orientation: {
        type: "string",
        description: 'Orientation used during the trial ("horizontal" or "vertical").',
      },
      first_interaction_ms: {
        type: ["number", "null"],
        description:
          "Milliseconds from scene appearance to first slider interaction. Null if no interaction.",
      },
      response_time_ms: {
        type: "number",
        description:
          "Milliseconds from scene appearance to the participant pressing Submit.",
      },
    };

    const options: GameOptions = {
      name: "Affective Slider",
      id: "affective-slider",
      publishUuid: "6e2f1b04-3a8c-4d5e-9f2a-b7c1d4e8f012",
      version: "__PACKAGE_JSON_VERSION__",
      moduleMetadata: Constants.MODULE_METADATA_PLACEHOLDER,
      shortDescription:
        "A self-assessment scale measuring pleasure and arousal on continuous 0–1 scales.",
      longDescription: `The Affective Slider (AS) is a digital self-assessment tool \
measuring two dimensions of emotion — pleasure (valence) and arousal — using continuous \
slider controls. Each slider is bounded by emoticon faces and normalized to [0, 1]. \
The assessment supports horizontal (original AS) and vertical (VAMS-style) orientations \
with configurable presentation order and label display.`,
      uri: "https://github.com/albertobeta/AffectiveSlider",
      showFps: defaultParameters.show_fps.default as boolean,
      width: CANVAS_W,
      height: CANVAS_H,
      trialSchema,
      parameters: defaultParameters,
      images: [
        { imageName: "face-sad", url: "faces/sad.svg", width: FACE_SIZE, height: FACE_SIZE },
        { imageName: "face-happy", url: "faces/happy.svg", width: FACE_SIZE, height: FACE_SIZE },
        { imageName: "face-tired", url: "faces/tired.svg", width: FACE_SIZE, height: FACE_SIZE },
        { imageName: "face-energetic", url: "faces/energetic.svg", width: FACE_SIZE, height: FACE_SIZE },
      ],
    };

    super(options);
  }

  override async initialize(): Promise<void> {
    await super.initialize();
    const game = this;

    // ── Instruction scenes ────────────────────────────────────────────────────
    const instructionScenes = Instructions.create({
      instructionScenes: [
        {
          title: "How are you feeling?",
          text: "You will rate your current emotional state using two sliders.\n\nDrag each slider to show how you feel right now.",
          textFontSize: 18,
          titleFontSize: 24,
        },
        {
          title: "Two dimensions",
          text: "The first slider measures your pleasure — from sad to happy.\n\nThe second measures your arousal — from sleepy to wide awake.\n\nBoth sliders start in the middle.",
          textFontSize: 17,
          titleFontSize: 22,
          nextButtonText: "Start",
          nextButtonBackgroundColor: GREY_DARK,
        },
      ],
    });
    game.addScenes(instructionScenes);

    // ── Rating scene ──────────────────────────────────────────────────────────
    const ratingScene = new Scene({ backgroundColor: GREY_BG });
    game.addScene(ratingScene);

    // Determine presentation order
    const pleasureFirst =
      !game.getParameter<boolean>("randomize_order") ||
      Math.random() >= 0.5;

    // State for each dimension
    const pleasureState: SliderState = { value: 0.5, interacted: false, firstInteractionMs: null };
    const arousalState: SliderState = { value: 0.5, interacted: false, firstInteractionMs: null };

    let firstInteractionMs: number | null = null;

    const orientation = game.getParameter<string>("orientation") as "horizontal" | "vertical";
    const showLabels = game.getParameter<boolean>("show_labels");
    const requireBoth = game.getParameter<boolean>("require_both_interactions");

    // ── Submit button ─────────────────────────────────────────────────────────
    const submitButton = new Button({
      text: "Submit",
      position: { x: CANVAS_W / 2, y: CANVAS_H - 52 },
      size: { width: 200, height: 48 },
      backgroundColor: GREY_MID,
      fontColor: WHITE,
      cornerRadius: 24,
      hidden: false,
      isUserInteractionEnabled: false,
    });

    const hintLabel = new Label({
      text: requireBoth
        ? "Move both sliders to continue"
        : "Move a slider to continue",
      fontSize: 13,
      fontColor: GREY_MID,
      position: { x: CANVAS_W / 2, y: CANVAS_H - 96 },
    });

    /** Re-evaluate whether the submit button should be enabled. */
    function updateSubmitState(): void {
      const canSubmit = requireBoth
        ? pleasureState.interacted && arousalState.interacted
        : pleasureState.interacted || arousalState.interacted;
      submitButton.isUserInteractionEnabled = canSubmit;
      submitButton.backgroundColor = canSubmit ? GREY_DARK : GREY_MID;
      hintLabel.hidden = canSubmit;
    }

    /** Called when a slider changes; records interaction and updates state. */
    function onSliderChange(
      state: SliderState,
      rawValue: number,
      /** value already normalized 0-1 for vertical; horizontal needs dividing by 100 */
      isHorizontal: boolean
    ): void {
      const normalized = isHorizontal ? rawValue / 100 : rawValue;
      state.value = Math.max(0, Math.min(1, normalized));

      if (!state.interacted) {
        state.interacted = true;
        state.firstInteractionMs = Timer.elapsed("ratingTimer");

        if (firstInteractionMs === null) {
          firstInteractionMs = state.firstInteractionMs;
        }
      }
      updateSubmitState();
    }

    // ── Build sliders depending on orientation ────────────────────────────────
    if (orientation === "horizontal") {
      buildHorizontalLayout(
        ratingScene,
        pleasureFirst,
        pleasureState,
        arousalState,
        showLabels,
        onSliderChange,
        submitButton,
        hintLabel
      );
    } else {
      buildVerticalLayout(
        ratingScene,
        pleasureFirst,
        pleasureState,
        arousalState,
        showLabels,
        onSliderChange,
        submitButton,
        hintLabel
      );
    }

    // ── Submit handler ────────────────────────────────────────────────────────
    submitButton.onTapDown(() => {
      const responseMs = Timer.elapsed("ratingTimer");
      Timer.remove("ratingTimer");

      game.addTrialData("pleasure_value", Math.round(pleasureState.value * 1000) / 1000);
      game.addTrialData("arousal_value", Math.round(arousalState.value * 1000) / 1000);
      game.addTrialData("pleasure_interacted", pleasureState.interacted);
      game.addTrialData("arousal_interacted", arousalState.interacted);
      game.addTrialData("pleasure_slider_position", pleasureFirst ? "first" : "second");
      game.addTrialData("orientation", orientation);
      game.addTrialData("first_interaction_ms", firstInteractionMs);
      game.addTrialData("response_time_ms", responseMs);

      game.trialComplete();
      game.end();
    });

    ratingScene.onAppear(() => {
      Timer.startNew("ratingTimer");
    });
  }
}

// ── Layout builders ───────────────────────────────────────────────────────────

/**
 * Horizontal layout: two rows, each with [face] — [slider] — [face]
 * Matches the original AffectiveSlider design.
 */
function buildHorizontalLayout(
  scene: Scene,
  pleasureFirst: boolean,
  pleasureState: SliderState,
  arousalState: SliderState,
  showLabels: boolean,
  onChange: (state: SliderState, value: number, isH: boolean) => void,
  submitButton: Button,
  hintLabel: Label
): void {
  const dimensions = pleasureFirst
    ? [
        { label: "Pleasure", lowFace: "face-sad", highFace: "face-happy", lowText: "Sad", highText: "Happy", state: pleasureState },
        { label: "Arousal", lowFace: "face-tired", highFace: "face-energetic", lowText: "Sleepy", highText: "Wide Awake", state: arousalState },
      ]
    : [
        { label: "Arousal", lowFace: "face-tired", highFace: "face-energetic", lowText: "Sleepy", highText: "Wide Awake", state: arousalState },
        { label: "Pleasure", lowFace: "face-sad", highFace: "face-happy", lowText: "Sad", highText: "Happy", state: pleasureState },
      ];

  const rowY = [200, 380];

  dimensions.forEach((dim, i) => {
    const y = rowY[i];

    // Dimension label
    const titleLabel = new Label({
      text: dim.label,
      fontSize: 15,
      fontColor: GREY_DARK,
      position: { x: CANVAS_W / 2, y: y - 56 },
    });
    scene.addChild(titleLabel);

    // Low-end face
    const lowFace = new Sprite({
      imageName: dim.lowFace,
      position: { x: 36, y },
    });
    scene.addChild(lowFace);

    if (showLabels) {
      scene.addChild(new Label({
        text: dim.lowText,
        fontSize: 11,
        fontColor: GREY_MID,
        position: { x: 36, y: y + FACE_SIZE / 2 + 10 },
      }));
    }

    // High-end face
    const highFace = new Sprite({
      imageName: dim.highFace,
      position: { x: CANVAS_W - 36, y },
    });
    scene.addChild(highFace);

    if (showLabels) {
      scene.addChild(new Label({
        text: dim.highText,
        fontSize: 11,
        fontColor: GREY_MID,
        position: { x: CANVAS_W - 36, y: y + FACE_SIZE / 2 + 10 },
      }));
    }

    // Horizontal slider (built-in m2c2kit Slider, scale 0–100 → normalized ÷100)
    const slider = new Slider({
      trackSize: { width: TRACK_LENGTH, height: 8 },
      trackColor: GREY_TRACK,
      thumbSize: { width: 12, height: 36 },
      thumbColor: GREY_LIGHT,
      min: 0,
      max: 100,
      value: 50,
      position: { x: CANVAS_W / 2, y },
    });
    scene.addChild(slider);

    slider.onValueChanged((e) => onChange(dim.state, e.value, true));
  });

  scene.addChild(hintLabel);
  scene.addChild(submitButton);
}

/**
 * Vertical layout: two columns, each with [face-top] — [slider] — [face-bottom]
 * Matches the VAMS (Visual Analog Mood Scales) vertical presentation.
 * Value convention: 0 = top, 1 = bottom; callers invert for positive dimensions.
 */
function buildVerticalLayout(
  scene: Scene,
  pleasureFirst: boolean,
  pleasureState: SliderState,
  arousalState: SliderState,
  showLabels: boolean,
  onChange: (state: SliderState, value: number, isH: boolean) => void,
  submitButton: Button,
  hintLabel: Label
): void {
  const dimensions = pleasureFirst
    ? [
        {
          label: "Pleasure",
          topFace: "face-happy", bottomFace: "face-sad",
          topText: "Happy", bottomText: "Sad",
          // Top = high (happy = 1), bottom = low (sad = 0) → invert raw slider value
          state: pleasureState,
          invertValue: true,
        },
        {
          label: "Arousal",
          topFace: "face-energetic", bottomFace: "face-tired",
          topText: "Wide Awake", bottomText: "Sleepy",
          state: arousalState,
          invertValue: true,
        },
      ]
    : [
        {
          label: "Arousal",
          topFace: "face-energetic", bottomFace: "face-tired",
          topText: "Wide Awake", bottomText: "Sleepy",
          state: arousalState,
          invertValue: true,
        },
        {
          label: "Pleasure",
          topFace: "face-happy", bottomFace: "face-sad",
          topText: "Happy", bottomText: "Sad",
          state: pleasureState,
          invertValue: true,
        },
      ];

  const colX = [CANVAS_W / 4, (3 * CANVAS_W) / 4];
  const centerY = CANVAS_H / 2 - 20;

  dimensions.forEach((dim, i) => {
    const x = colX[i];

    // Dimension label
    scene.addChild(new Label({
      text: dim.label,
      fontSize: 14,
      fontColor: GREY_DARK,
      position: { x, y: 60 },
    }));

    // Top face (high end)
    scene.addChild(new Sprite({
      imageName: dim.topFace,
      position: { x, y: 110 },
    }));

    if (showLabels) {
      scene.addChild(new Label({
        text: dim.topText,
        fontSize: 10,
        fontColor: GREY_MID,
        position: { x, y: 110 + FACE_SIZE / 2 + 10 },
      }));
    }

    // Vertical slider — value 0 = top, 1 = bottom
    const vSlider = new VerticalSlider({
      trackSize: { width: 8, height: TRACK_LENGTH },
      trackColor: GREY_TRACK,
      thumbSize: { width: 36, height: 36 },
      thumbColor: GREY_LIGHT,
      min: 0,
      max: 1,
      value: 0.5,
      position: { x, y: centerY },
    });
    scene.addChild(vSlider);

    vSlider.onValueChanged((e) => {
      // If top = high end, invert so 0 (top) → 1 (maximum) for the caller
      const adjusted = dim.invertValue ? 1 - e.value : e.value;
      onChange(dim.state, adjusted, false);
    });

    // Bottom face (low end)
    scene.addChild(new Sprite({
      imageName: dim.bottomFace,
      position: { x, y: centerY + TRACK_LENGTH / 2 + FACE_SIZE / 2 + 8 },
    }));

    if (showLabels) {
      scene.addChild(new Label({
        text: dim.bottomText,
        fontSize: 10,
        fontColor: GREY_MID,
        position: { x, y: centerY + TRACK_LENGTH / 2 + FACE_SIZE + 18 },
      }));
    }
  });

  scene.addChild(hintLabel);
  scene.addChild(submitButton);
}

export { AffectiveSliderGame };

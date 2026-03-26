/**
 * VerticalSlider — a vertical-orientation slider Composite for m2c2kit.
 *
 * The built-in @m2c2kit/addons Slider is horizontal-only (x-axis drag).
 * This composite mirrors its API surface but constrains dragging to the y-axis,
 * supporting the VAMS-style vertical presentation described in Kontou et al. (2012).
 *
 * Value semantics: 0 = top of track, 1 = bottom of track (can be inverted
 * by the caller if needed for a particular dimension).
 */

import {
  WebColors,
  Shape,
  Composite,
  CompositeOptions,
  Size,
  RgbaColor,
  CompositeEvent,
  M2NodeEventListener,
  CallbackOptions,
  M2NodeEvent,
  M2EventType,
  M2c2KitHelpers,
  M2Error,
  IDrawable,
} from "@m2c2kit/core";
import { Canvas } from "canvaskit-wasm";

export interface VerticalSliderOptions extends CompositeOptions {
  /** Size of the vertical track. height = physical track length, width = track thickness. */
  trackSize?: Size;
  /** Track color (greyscale recommended per AS spec). */
  trackColor?: RgbaColor;
  /** Size of the draggable thumb. */
  thumbSize?: Size;
  /** Thumb color. */
  thumbColor?: RgbaColor;
  /** Minimum value (maps to top of track). Default: 0. */
  min?: number;
  /** Maximum value (maps to bottom of track). Default: 1. */
  max?: number;
  /** Initial value. Default: 0.5 (center). */
  value?: number;
}

export interface VerticalSliderEvent extends CompositeEvent {
  type: "Composite";
  compositeType: "VerticalSlider";
  compositeEventType: "SliderValueChanged";
  target: VerticalSlider | string;
  /** Normalized value in [min, max]. */
  value: number;
}

export class VerticalSlider extends Composite implements VerticalSliderOptions {
  readonly compositeType = "VerticalSlider";

  private originalOptions: VerticalSliderOptions;
  private _trackSize: Size = { width: 8, height: 260 };
  private _trackColor: RgbaColor = [100, 100, 100, 1];
  private _thumbSize: Size = { width: 44, height: 44 };
  private _thumbColor: RgbaColor = [200, 200, 200, 1];
  private _min = 0;
  private _max = 1;
  private _value = 0.5;

  private _thumbShape?: Shape;

  private get thumbShape(): Shape {
    if (!this._thumbShape) throw new M2Error("VerticalSlider: thumbShape not initialized.");
    return this._thumbShape;
  }

  constructor(options: VerticalSliderOptions) {
    super(options);
    this.originalOptions = JSON.parse(JSON.stringify(options));
    if (options.trackSize !== undefined) this._trackSize = options.trackSize;
    if (options.trackColor !== undefined) this._trackColor = options.trackColor;
    if (options.thumbSize !== undefined) this._thumbSize = options.thumbSize;
    if (options.thumbColor !== undefined) this._thumbColor = options.thumbColor;
    if (options.min !== undefined) this._min = options.min;
    if (options.max !== undefined) this._max = options.max;
    if (options.value !== undefined) this._value = options.value;
    this.saveNodeNewEvent();
  }

  override get completeNodeOptions() {
    return {
      ...this.options,
      ...this.getNodeOptions(),
      ...this.getDrawableOptions(),
      ...this.originalOptions,
    };
  }

  /** Convert a value in [min, max] to a y-offset within the track (0 = top). */
  private valueToY(value: number): number {
    const fraction = (value - this._min) / (this._max - this._min);
    return fraction * this._trackSize.height - this._trackSize.height / 2;
  }

  /** Convert a y-offset within the track to a value in [min, max]. */
  private yToValue(y: number): number {
    const fraction = (y + this._trackSize.height / 2) / this._trackSize.height;
    return this._min + Math.max(0, Math.min(1, fraction)) * (this._max - this._min);
  }

  override initialize(): void {
    this.removeAllChildren();

    // Visible track bar
    const trackShape = new Shape({
      rect: { width: this._trackSize.width, height: this._trackSize.height },
      cornerRadius: this._trackSize.width / 2,
      fillColor: this._trackColor,
    });
    this.addChild(trackShape);

    // Thumb (draggable circle)
    this._thumbShape = new Shape({
      circleOfRadius: this._thumbSize.width / 2,
      fillColor: this._thumbColor,
      strokeColor: [80, 80, 80, 1],
      lineWidth: 2,
      isUserInteractionEnabled: true,
      draggable: true,
      zPosition: 1,
      position: { x: 0, y: this.valueToY(this._value) },
    });
    trackShape.addChild(this._thumbShape);

    // Wide invisible zone over the full track height — accepts taps anywhere on track
    const trackZone = new Shape({
      rect: {
        width: Math.max(this._thumbSize.width, this._trackSize.width) + 20,
        height: this._trackSize.height,
      },
      alpha: 0,
      isUserInteractionEnabled: true,
      zPosition: 0,
    });
    trackShape.addChild(trackZone);

    trackZone.onTapDown((e) => {
      const clampedY = Math.max(
        -this._trackSize.height / 2,
        Math.min(this._trackSize.height / 2, e.point.y)
      );
      this._thumbShape!.position.y = clampedY;
      this.emitValue();
    });

    // Wide tall zone that captures pointer events even outside the slider bounds
    const thumbZone = new Shape({
      rect: {
        width: Math.max(this._thumbSize.width, this._trackSize.width) + 20,
        height: this.parentSceneAsNode.size.height * 2,
      },
      alpha: 0,
      isUserInteractionEnabled: true,
    });
    this.addChild(thumbZone);

    thumbZone.onPointerMove(() => {
      this._thumbShape!.draggable = true;
    });
    thumbZone.onPointerLeave(() => {
      this._thumbShape!.draggable = false;
    });

    this._thumbShape.onTapDown((e) => {
      e.handled = true;
      // Clamp thumb to track bounds
      const clampedY = Math.max(
        -this._trackSize.height / 2,
        Math.min(this._trackSize.height / 2, this._thumbShape!.position.y)
      );
      this._thumbShape!.position.y = clampedY;
      if (e.point.x !== 0) this._thumbShape!.position.x = 0;
      this.emitValue();
    });

    this._thumbShape.onDrag((e) => {
      // Constrain to vertical axis only
      this._thumbShape!.position.x = 0;
      const clampedY = Math.max(
        -this._trackSize.height / 2,
        Math.min(this._trackSize.height / 2, e.position.y)
      );
      this._thumbShape!.position.y = clampedY;
      this.emitValue();
    });

    this._thumbShape.onDragEnd(() => {
      // Snap to clean floating-point resolution
      const rawValue = this.yToValue(this._thumbShape!.position.y);
      const snapped = Math.round(rawValue * 1000) / 1000;
      this._value = snapped;
      this._thumbShape!.position.y = this.valueToY(snapped);
      this.emitValue();
    });

    this.needsInitialization = false;
  }

  private emitValue(): void {
    const rawValue = this.yToValue(this._thumbShape!.position.y);
    this._value = Math.max(this._min, Math.min(this._max, rawValue));

    const event: VerticalSliderEvent = {
      type: M2EventType.Composite,
      compositeType: "VerticalSlider",
      compositeEventType: "SliderValueChanged",
      target: this,
      value: this._value,
      ...M2c2KitHelpers.createTimestamps(),
    };

    this.handleCompositeEvent(event);
    this.saveEvent(event);

    this.eventListeners
      .filter(
        (l) =>
          l.type === M2EventType.Composite &&
          l.compositeType === this.compositeType &&
          l.compositeEventType === "SliderValueChanged"
      )
      .forEach((l) => l.callback(event as unknown as M2NodeEvent));
  }

  /**
   * Registers a callback that fires whenever the slider value changes.
   */
  onValueChanged(
    callback: (event: VerticalSliderEvent) => void,
    options?: CallbackOptions
  ): void {
    const listener: M2NodeEventListener<VerticalSliderEvent> = {
      type: M2EventType.Composite,
      compositeEventType: "SliderValueChanged",
      compositeType: this.compositeType,
      nodeUuid: this.uuid,
      callback: callback as (ev: M2NodeEvent) => void,
    };
    if (options?.replaceExisting) {
      this.eventListeners = this.eventListeners.filter(
        (l) =>
          !(
            l.nodeUuid === listener.nodeUuid &&
            l.type === listener.type &&
            l.compositeType === listener.compositeType
          )
      );
    }
    this.eventListeners.push(listener as M2NodeEventListener<M2NodeEvent>);
  }

  // ── Getters / setters ──────────────────────────────────────────────────────

  get trackSize(): Size { return this._trackSize; }
  set trackSize(v: Size) { this._trackSize = v; }

  get trackColor(): RgbaColor { return this._trackColor; }
  set trackColor(v: RgbaColor) { this._trackColor = v; }

  get thumbSize(): Size { return this._thumbSize; }
  set thumbSize(v: Size) { this._thumbSize = v; }

  get thumbColor(): RgbaColor { return this._thumbColor; }
  set thumbColor(v: RgbaColor) { this._thumbColor = v; }

  get value(): number { return this._value; }
  set value(v: number) { this._value = v; }

  get min(): number { return this._min; }
  set min(v: number) { this._min = v; }

  get max(): number { return this._max; }
  set max(v: number) { this._max = v; }

  duplicate(_newName?: string): VerticalSlider {
    throw new M2Error("VerticalSlider.duplicate() not implemented.");
  }

  update(): void { super.update(); }

  draw(canvas: Canvas): void { super.drawChildren(canvas); }

  warmup(canvas: Canvas): void {
    this.initialize();
    this.children
      .filter((c) => c.isDrawable)
      .forEach((c) => (c as unknown as IDrawable).warmup(canvas));
  }
}

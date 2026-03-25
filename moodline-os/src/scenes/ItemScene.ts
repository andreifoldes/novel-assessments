/**
 * ItemScene — Displays a single MoodLine-OS item.
 *
 * Features:
 *  - Vertical VAS track that is exactly 100mm in physical length
 *  - Two cartoon faces (top & bottom), with optional verbal labels
 *  - Draggable circular marker (touch & mouse), starts at midpoint
 *  - "Next" button enabled only after marker has been moved
 *  - Records firstInteractionMs and responseTimeMs
 *
 * Calls onNext(response) when the user submits.
 */

import type { ItemId, Mode, LabelMode } from '../urlParams';
import type { ItemResponse } from '../scoring';
import { ITEMS } from '../items';
import { get100mmPx } from '../vasLength';
import { adjustScore } from '../scoring';

const MARKER_SIZE = 48; // px
const FACE_SIZE = 72;   // px

const STYLES = `
  .item-scene {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 1rem 1.5rem 1.5rem;
    background: #F8F9FA;
    user-select: none;
  }
  .item-header {
    display: flex;
    width: 100%;
    justify-content: space-between;
    align-items: center;
  }
  .item-progress {
    font-size: 0.875rem;
    color: #4A5568;
    font-weight: 500;
  }
  .item-mode-badge {
    font-size: 0.75rem;
    color: #718096;
    border: 1px solid #CBD5E0;
    border-radius: 20px;
    padding: 2px 10px;
  }
  .item-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
  }
  .item-vas-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
  .item-face-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .item-face {
    width: ${FACE_SIZE}px;
    height: ${FACE_SIZE}px;
    display: block;
    filter: grayscale(100%);
  }
  .item-face-label {
    font-size: 0.9375rem;
    font-weight: 500;
    color: #4A5568;
    text-align: center;
  }
  .item-track-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .item-track {
    width: 6px;
    background: #CBD5E0;
    border-radius: 3px;
    position: relative;
  }
  .item-marker {
    width: ${MARKER_SIZE}px;
    height: ${MARKER_SIZE}px;
    border-radius: 50%;
    background: #EBF8FF;
    border: 3px solid #2B6CB0;
    box-shadow: 0 3px 12px rgba(43,108,176,0.35);
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    cursor: grab;
    touch-action: none;
    transition: box-shadow 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .item-marker:focus-visible {
    outline: 3px solid #2B6CB0;
    outline-offset: 3px;
  }
  .item-marker.dragging {
    cursor: grabbing;
    box-shadow: 0 6px 20px rgba(43,108,176,0.5);
  }
  .item-marker-inner {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #2B6CB0;
  }
  .item-footer {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
  .item-hint {
    font-size: 0.875rem;
    color: #A0AEC0;
    text-align: center;
    transition: opacity 0.3s;
  }
  .item-hint.hidden { opacity: 0; pointer-events: none; }
  .item-next-btn {
    width: 100%;
    max-width: 360px;
    padding: 1rem;
    font-size: 1.125rem;
    font-weight: 700;
    font-family: inherit;
    background: #2B6CB0;
    color: white;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    min-height: 56px;
    box-shadow: 0 4px 14px rgba(43,108,176,0.35);
    transition: background 0.15s, transform 0.1s, opacity 0.2s;
  }
  .item-next-btn:disabled {
    background: #CBD5E0;
    color: #718096;
    box-shadow: none;
    cursor: not-allowed;
  }
  .item-next-btn:not(:disabled):hover { background: #1A4A8A; }
  .item-next-btn:not(:disabled):active { transform: scale(0.97); }
  .item-next-btn:focus-visible {
    outline: 3px solid #2B6CB0;
    outline-offset: 3px;
  }
`;

interface ItemSceneOptions {
  item: ItemId;
  mode: Mode;
  labels: LabelMode;
  index: number;
  total: number;
  onNext: (response: ItemResponse) => void;
}

export class ItemScene {
  private container: HTMLElement;
  private opts: ItemSceneOptions;

  // State
  private sceneStartTime = 0;
  private firstInteractionTime = 0;
  private hasInteracted = false;
  /** 0–100; 0 = top, 100 = bottom. Starts at 50 (midpoint). */
  private currentValue = 50;

  // DOM refs (populated in render)
  private trackEl!: HTMLElement;
  private markerEl!: HTMLElement;
  private nextBtn!: HTMLButtonElement;
  private hintEl!: HTMLElement;
  private trackHeight = 0;

  constructor(container: HTMLElement, opts: ItemSceneOptions) {
    this.container = container;
    this.opts = opts;
  }

  render(): void {
    if (!document.getElementById('item-styles')) {
      const style = document.createElement('style');
      style.id = 'item-styles';
      style.textContent = STYLES;
      document.head.appendChild(style);
    }

    const { item, mode, labels, index, total } = this.opts;
    const def = ITEMS[item];
    const isRevised = mode === 'revised';
    const topFaceName = isRevised ? def.revisedTopFace : def.standardTopFace;
    const botFaceName = isRevised ? def.revisedBotFace : def.standardBotFace;
    const topLabel = this.faceLabel(topFaceName, def.label, isRevised, true);
    const botLabel = this.faceLabel(botFaceName, def.label, isRevised, false);

    const trackHeight = get100mmPx();
    this.trackHeight = trackHeight;

    const showLabels = labels === 'words';

    this.container.innerHTML = `
      <section class="item-scene" role="region" aria-label="Mood scale: ${def.label}">
        <header class="item-header">
          <span class="item-progress" aria-live="polite" aria-atomic="true">
            ${index + 1} of ${total}
          </span>
          <span class="item-mode-badge" aria-label="Mode: ${mode.toUpperCase()}">${mode.toUpperCase()}</span>
        </header>

        <div class="item-body">
          <div class="item-vas-col">
            <!-- Top face: label above the image -->
            <div class="item-face-wrap">
              ${showLabels ? `<span class="item-face-label" aria-hidden="true">${topLabel}</span>` : ''}
              <img
                class="item-face"
                src="${import.meta.env.BASE_URL}faces/${topFaceName}.svg"
                alt="${topLabel}"
                draggable="false"
              />
            </div>

            <!-- VAS track -->
            <div
              class="item-track-wrap"
              style="height: ${trackHeight}px; width: ${MARKER_SIZE + 16}px;"
              aria-hidden="true"
            >
              <div
                class="item-track"
                id="vas-track"
                style="height: ${trackHeight}px;"
              ></div>
              <div
                class="item-marker"
                id="vas-marker"
                role="slider"
                aria-label="${def.label} mood level"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="50"
                aria-orientation="vertical"
                tabindex="0"
                style="top: calc(50% - ${MARKER_SIZE / 2}px);"
              >
                <div class="item-marker-inner"></div>
              </div>
            </div>

            <!-- Bottom face: label below the image -->
            <div class="item-face-wrap">
              <img
                class="item-face"
                src="${import.meta.env.BASE_URL}faces/${botFaceName}.svg"
                alt="${botLabel}"
                draggable="false"
              />
              ${showLabels ? `<span class="item-face-label" aria-hidden="true">${botLabel}</span>` : ''}
            </div>
          </div>
        </div>

        <footer class="item-footer">
          <p class="item-hint" id="item-hint">Drag the circle to show how you feel</p>
          <button
            class="item-next-btn"
            id="item-next"
            disabled
            aria-disabled="true"
          >${index + 1 < total ? 'Next →' : 'Finish'}</button>
        </footer>
      </section>
    `;

    this.trackEl = this.container.querySelector<HTMLElement>('#vas-track')!;
    this.markerEl = this.container.querySelector<HTMLElement>('#vas-marker')!;
    this.nextBtn = this.container.querySelector<HTMLButtonElement>('#item-next')!;
    this.hintEl = this.container.querySelector<HTMLElement>('#item-hint')!;

    this.sceneStartTime = performance.now();
    this.setMarkerValue(50, false);
    this.attachEvents();

    // Focus marker for keyboard users
    setTimeout(() => this.markerEl.focus(), 50);
  }

  private faceLabel(faceName: string, itemLabel: string, _isRevised: boolean, isTop: boolean): string {
    if (faceName === 'neutral') return 'Neutral';
    // Top face for positive items (happy/energetic) in revised mode shows the positive state
    if (isTop && (faceName === 'happy' || faceName === 'energetic')) {
      return faceName.charAt(0).toUpperCase() + faceName.slice(1);
    }
    return itemLabel;
  }

  private setMarkerValue(value: number, fromUser: boolean): void {
    this.currentValue = Math.max(0, Math.min(100, value));
    const fraction = this.currentValue / 100;
    const trackH = this.trackHeight;
    const topPx = fraction * trackH - MARKER_SIZE / 2;

    this.markerEl.style.top = `${topPx}px`;
    this.markerEl.setAttribute('aria-valuenow', String(Math.round(this.currentValue)));

    if (fromUser && !this.hasInteracted) {
      this.hasInteracted = true;
      this.firstInteractionTime = performance.now();
      this.nextBtn.disabled = false;
      this.nextBtn.removeAttribute('aria-disabled');
      this.hintEl.classList.add('hidden');
    }
  }

  private attachEvents(): void {
    // Mouse drag
    this.markerEl.addEventListener('mousedown', this.onDragStart);
    // Touch drag
    this.markerEl.addEventListener('touchstart', this.onTouchStart, { passive: false });
    // Keyboard
    this.markerEl.addEventListener('keydown', this.onKeyDown);
    // Next button
    this.nextBtn.addEventListener('click', () => this.submit());
    this.nextBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') this.submit();
    });
  }

  private onDragStart = (e: MouseEvent): void => {
    e.preventDefault();
    this.markerEl.classList.add('dragging');
    const onMove = (me: MouseEvent) => this.updateFromClientY(me.clientY);
    const onUp = () => {
      this.markerEl.classList.remove('dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    this.markerEl.classList.add('dragging');
    const onMove = (te: TouchEvent) => {
      if (te.touches[0]) this.updateFromClientY(te.touches[0].clientY);
    };
    const onEnd = () => {
      this.markerEl.classList.remove('dragging');
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    let delta = 0;
    if (e.key === 'ArrowUp') delta = -2;
    else if (e.key === 'ArrowDown') delta = 2;
    else if (e.key === 'Home') { this.setMarkerValue(0, true); return; }
    else if (e.key === 'End') { this.setMarkerValue(100, true); return; }
    else return;
    e.preventDefault();
    this.setMarkerValue(this.currentValue + delta, true);
  };

  private updateFromClientY(clientY: number): void {
    const trackRect = this.trackEl.getBoundingClientRect();
    const relY = clientY - trackRect.top;
    const fraction = relY / this.trackHeight;
    this.setMarkerValue(fraction * 100, true);
  }

  private submit(): void {
    if (!this.hasInteracted || this.nextBtn.disabled) return;
    const now = performance.now();
    const raw = Math.round(this.currentValue);
    const adjusted = adjustScore(raw, this.opts.item, this.opts.mode);
    const def = ITEMS[this.opts.item];

    const response: ItemResponse = {
      id: this.opts.item,
      label: def.label,
      mode: this.opts.mode,
      rawScore: raw,
      adjustedScore: adjusted,
      firstInteractionMs: Math.round(this.firstInteractionTime - this.sceneStartTime),
      responseTimeMs: Math.round(now - this.sceneStartTime),
      order: this.opts.index,
    };

    this.destroy();
    this.opts.onNext(response);
  }

  destroy(): void {
    // Remove global listeners if still attached (safety)
    this.container.innerHTML = '';
  }
}

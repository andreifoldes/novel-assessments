/**
 * InstructionScene — Welcome screen with visual demo of the VAS.
 *
 * Rendered as pure HTML/CSS injected into #app.
 * Calls onStart() when the user taps "Begin".
 */

import type { AssessmentParams } from '../urlParams';

const STYLES = `
  .instr-scene {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem 1.5rem;
    gap: 1.5rem;
    background: #F8F9FA;
  }
  .instr-title {
    font-size: 1.625rem;
    font-weight: 700;
    color: #1A202C;
    text-align: center;
  }
  .instr-subtitle {
    font-size: 1.0625rem;
    color: #4A5568;
    text-align: center;
    max-width: 480px;
    line-height: 1.6;
  }
  .instr-demo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.25rem 2rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  }
  .instr-demo-label {
    font-size: 0.875rem;
    color: #4A5568;
    font-weight: 500;
  }
  .instr-demo-face {
    width: 52px;
    height: 52px;
    filter: grayscale(100%);
  }
  .instr-demo-track {
    width: 4px;
    height: 80px;
    background: #718096;
    border-radius: 2px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .instr-demo-marker {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #EBF8FF;
    border: 3px solid #2B6CB0;
    position: absolute;
    cursor: grab;
    box-shadow: 0 2px 8px rgba(43,108,176,0.3);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .instr-hint {
    font-size: 0.875rem;
    color: #718096;
    text-align: center;
  }
  .instr-btn {
    margin-top: 0.5rem;
    padding: 1rem 3rem;
    font-size: 1.125rem;
    font-weight: 700;
    font-family: inherit;
    background: #2B6CB0;
    color: white;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    min-width: 200px;
    min-height: 56px;
    box-shadow: 0 4px 14px rgba(43,108,176,0.35);
    transition: background 0.15s, transform 0.1s;
  }
  .instr-btn:hover { background: #1A4A8A; }
  .instr-btn:active { transform: scale(0.97); }
  .instr-btn:focus-visible {
    outline: 3px solid #2B6CB0;
    outline-offset: 3px;
  }
`;

function makeDemoSvg(name: string, label: string): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
      <img
        class="instr-demo-face"
        src="/faces/${name}.svg"
        alt="${label}"
        aria-hidden="true"
      />
      <span class="instr-demo-label">${label}</span>
    </div>
  `;
}

export class InstructionScene {
  private container: HTMLElement;
  private onStart: () => void;

  constructor(container: HTMLElement, _params: AssessmentParams, onStart: () => void) {
    this.container = container;
    this.onStart = onStart;
  }

  render(): void {
    // Inject styles once
    if (!document.getElementById('instr-styles')) {
      const style = document.createElement('style');
      style.id = 'instr-styles';
      style.textContent = STYLES;
      document.head.appendChild(style);
    }

    this.container.innerHTML = `
      <section class="instr-scene" role="region" aria-label="Assessment instructions">
        <h1 class="instr-title">How are you feeling?</h1>
        <p class="instr-subtitle">
          You will see a line with two faces — one at the top, one at the bottom.
          Drag the circle to show how you feel right now.
        </p>

        <div class="instr-demo" aria-hidden="true">
          ${makeDemoSvg('neutral', 'Neutral')}
          <div class="instr-demo-track">
            <div class="instr-demo-marker"></div>
          </div>
          ${makeDemoSvg('sad', 'Sad')}
        </div>

        <p class="instr-hint">Move the circle up or down, then tap <strong>Next</strong>.</p>

        <button
          class="instr-btn"
          id="instr-begin"
          aria-label="Begin the assessment"
        >Begin</button>
      </section>
    `;

    const btn = this.container.querySelector<HTMLButtonElement>('#instr-begin')!;
    btn.addEventListener('click', () => this.onStart());
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') this.onStart();
    });

    // Focus the button for keyboard users
    setTimeout(() => btn.focus(), 50);
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}

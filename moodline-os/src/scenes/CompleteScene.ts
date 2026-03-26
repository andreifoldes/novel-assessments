/**
 * CompleteScene — Thank-you screen with JSON data export and optional callback.
 *
 * If the page was launched with `?callback_url=<url>&token=<token>` query params,
 * results are POSTed to that URL on completion (used by the iema-bot integration).
 * A `postMessage({ type: 'NOVEL_COMPLETE', data })` is also fired so parent
 * iframes (e.g. the PWA wrapper) can react without polling.
 */

import type { ScoredResults } from '../scoring';

const STYLES = `
  .complete-scene {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem 1.5rem;
    gap: 1.5rem;
    background: #F8F9FA;
    text-align: center;
  }
  .complete-icon {
    font-size: 4rem;
    line-height: 1;
  }
  .complete-title {
    font-size: 1.625rem;
    font-weight: 700;
    color: #1A202C;
  }
  .complete-subtitle {
    font-size: 1.0625rem;
    color: #4A5568;
    max-width: 400px;
    line-height: 1.6;
  }
  .complete-download-btn {
    padding: 0.875rem 2.5rem;
    font-size: 1rem;
    font-weight: 700;
    font-family: inherit;
    background: #2B6CB0;
    color: white;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    min-height: 52px;
    box-shadow: 0 4px 14px rgba(43,108,176,0.35);
    transition: background 0.15s;
  }
  .complete-download-btn:hover { background: #1A4A8A; }
  .complete-download-btn:focus-visible {
    outline: 3px solid #2B6CB0;
    outline-offset: 3px;
  }
`;

export class CompleteScene {
  private container: HTMLElement;
  private results: ScoredResults;

  constructor(container: HTMLElement, results: ScoredResults) {
    this.container = container;
    this.results = results;
  }

  render(): void {
    if (!document.getElementById('complete-styles')) {
      const style = document.createElement('style');
      style.id = 'complete-styles';
      style.textContent = STYLES;
      document.head.appendChild(style);
    }

    this.container.innerHTML = `
      <section class="complete-scene" role="region" aria-label="Assessment complete">
        <div class="complete-icon" aria-hidden="true">✓</div>
        <h1 class="complete-title">All done — thank you!</h1>
        <p class="complete-subtitle">Your responses have been recorded.</p>

        <button class="complete-download-btn" id="download-btn" aria-label="Download results as JSON">
          Download Results (JSON)
        </button>
      </section>
    `;

    const btn = this.container.querySelector<HTMLButtonElement>('#download-btn')!;
    btn.addEventListener('click', () => this.download());
    setTimeout(() => btn.focus(), 50);

    this.submitCallback();
  }

  /** POST results to callback_url if provided, and notify any parent iframe. */
  private submitCallback(): void {
    const p = new URLSearchParams(window.location.search);
    const callbackUrl = p.get('callback_url');
    const token = p.get('token');

    // Notify parent frame regardless (PWA wrapper listens for this)
    const msg = { type: 'NOVEL_COMPLETE', assessment: 'moodline-os', data: this.results };
    if (window.parent !== window) {
      window.parent.postMessage(msg, '*');
    }

    if (!callbackUrl || !token) return;

    fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, data: this.results }),
    }).catch(err => console.warn('[MoodLine-OS] Callback failed:', err));
  }

  private download(): void {
    const json = JSON.stringify(this.results, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moodline-os-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}

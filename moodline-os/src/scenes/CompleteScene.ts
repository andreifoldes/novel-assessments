/**
 * CompleteScene — Thank-you screen with score display and JSON data export.
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
  .complete-scores {
    background: white;
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    padding: 1.25rem 2rem;
    width: 100%;
    max-width: 400px;
  }
  .complete-scores h2 {
    font-size: 1rem;
    font-weight: 700;
    color: #1A202C;
    margin-bottom: 1rem;
  }
  .complete-score-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4rem 0;
    border-bottom: 1px solid #E2E8F0;
    font-size: 0.9375rem;
    color: #4A5568;
  }
  .complete-score-row:last-child { border-bottom: none; }
  .complete-score-val {
    font-weight: 700;
    color: #1A202C;
  }
  .complete-total {
    font-size: 1rem;
    font-weight: 700;
    color: #1A202C;
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

function scoreRow(label: string, value: number | null): string {
  const display = value !== null ? String(value) : '—';
  return `
    <div class="complete-score-row">
      <span>${label}</span>
      <span class="complete-score-val">${display}</span>
    </div>
  `;
}

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

    const { results } = this;
    const { subscores, totalScore, responses } = results;

    const itemRows = responses.map(r =>
      scoreRow(`${r.label} (${r.id})`, r.adjustedScore)
    ).join('');

    const subscopeSection = (subscores.negativeMood !== null || subscores.energy !== null || subscores.happiness !== null)
      ? `
        <div class="complete-scores">
          <h2>Subscores</h2>
          ${subscores.negativeMood !== null ? scoreRow('Negative Mood', subscores.negativeMood) : ''}
          ${subscores.energy !== null ? scoreRow('Energy', subscores.energy) : ''}
          ${subscores.happiness !== null ? scoreRow('Happiness', subscores.happiness) : ''}
        </div>
      ` : '';

    this.container.innerHTML = `
      <section class="complete-scene" role="region" aria-label="Assessment complete">
        <div class="complete-icon" aria-hidden="true">✓</div>
        <h1 class="complete-title">All done — thank you!</h1>
        <p class="complete-subtitle">Your responses have been recorded.</p>

        <div class="complete-scores">
          <h2>Scores by Item</h2>
          ${itemRows}
          ${scoreRow('Total', totalScore)}
        </div>

        ${subscopeSection}

        <button class="complete-download-btn" id="download-btn" aria-label="Download results as JSON">
          Download Results (JSON)
        </button>
      </section>
    `;

    const btn = this.container.querySelector<HTMLButtonElement>('#download-btn')!;
    btn.addEventListener('click', () => this.download());
    setTimeout(() => btn.focus(), 50);
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

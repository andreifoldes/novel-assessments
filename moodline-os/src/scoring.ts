/**
 * MoodLine-OS scoring utilities.
 */

import type { ItemId, Mode } from './urlParams';
import { ITEMS } from './items';

export interface ItemResponse {
  id: ItemId;
  label: string;
  mode: Mode;
  /** Position on VAS, 0 (top) to 100 (bottom) */
  rawScore: number;
  /** Reverse-coded score (always 0=least distress, 100=most distress) */
  adjustedScore: number;
  /** Time from scene load to first interaction (ms) */
  firstInteractionMs: number;
  /** Time from scene load to submission (ms) */
  responseTimeMs: number;
  order: number;
}

/** Apply reverse coding if needed for this item and mode */
export function adjustScore(raw: number, id: ItemId, mode: Mode): number {
  const item = ITEMS[id];
  const shouldReverse = mode === 'revised' ? item.revisedReverse : item.standardReverse;
  return shouldReverse ? 100 - raw : raw;
}

export interface ScoredResults {
  responses: ItemResponse[];
  totalScore: number | null;
  /** Only present when all 8 items are included */
  subscores: {
    negativeMood: number | null;
    energy: number | null;
    happiness: number | null;
  };
  completedAt: string;
  params: {
    mode: Mode;
    labels: string;
    randomize: boolean;
    itemOrder: ItemId[];
  };
}

const NEGATIVE_MOOD_IDS: ItemId[] = ['afraid', 'confused', 'sad', 'angry', 'tense'];
const ENERGY_IDS: ItemId[] = ['tired', 'energetic'];
const HAPPINESS_IDS: ItemId[] = ['happy'];

function sumIf(responses: ItemResponse[], ids: ItemId[]): number | null {
  const matching = responses.filter(r => ids.includes(r.id));
  if (matching.length !== ids.length) return null;
  return matching.reduce((acc, r) => acc + r.adjustedScore, 0);
}

export function computeResults(
  responses: ItemResponse[],
  params: { mode: Mode; labels: string; randomize: boolean; itemOrder: ItemId[] },
): ScoredResults {
  const totalScore = responses.length > 0
    ? responses.reduce((acc, r) => acc + r.adjustedScore, 0)
    : null;

  return {
    responses,
    totalScore,
    subscores: {
      negativeMood: sumIf(responses, NEGATIVE_MOOD_IDS),
      energy: sumIf(responses, ENERGY_IDS),
      happiness: sumIf(responses, HAPPINESS_IDS),
    },
    completedAt: new Date().toISOString(),
    params,
  };
}

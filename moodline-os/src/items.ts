/**
 * MoodLine-OS item definitions.
 *
 * Each item specifies:
 *   id               — unique identifier
 *   label            — verbal descriptor (emotion word)
 *   revisedTopFace   — face shown at TOP in revised mode
 *   revisedBotFace   — face shown at BOTTOM in revised mode
 *   standardTopFace  — face shown at TOP in standard mode
 *   standardBotFace  — face shown at BOTTOM in standard mode
 *   revisedReverse   — whether raw score should be reverse-coded in revised mode
 *
 * Revised mode key change:
 *   - 'cheerful' and 'lively' have the positive face at TOP (not calm)
 *   - All negative items retain calm at top in both modes
 *
 * Scoring convention: 0 = top of scale, 100 = bottom of scale.
 * For negative items: 0 = calm (no distress), 100 = max distress.
 * For cheerful/lively in revised mode: 0 = max positive, 100 = calm → reverse-code.
 */

import type { ItemId } from './urlParams';

export interface MoodItem {
  id: ItemId;
  label: string;
  revisedTopFace: string;   // SVG filename in shared/faces/
  revisedBotFace: string;
  standardTopFace: string;
  standardBotFace: string;
  /** Revised mode: reverse raw score before summing (positive items) */
  revisedReverse: boolean;
  /** Standard mode: reverse raw score before summing (always false) */
  standardReverse: boolean;
}

export const ITEMS: Record<ItemId, MoodItem> = {
  scared: {
    id: 'scared',
    label: 'Scared',
    revisedTopFace: 'calm', revisedBotFace: 'scared',
    standardTopFace: 'calm', standardBotFace: 'scared',
    revisedReverse: false,      standardReverse: false,
  },
  muddled: {
    id: 'muddled',
    label: 'Muddled',
    revisedTopFace: 'calm', revisedBotFace: 'muddled',
    standardTopFace: 'calm', standardBotFace: 'muddled',
    revisedReverse: false,      standardReverse: false,
  },
  unhappy: {
    id: 'unhappy',
    label: 'Unhappy',
    revisedTopFace: 'calm', revisedBotFace: 'unhappy',
    standardTopFace: 'calm', standardBotFace: 'unhappy',
    revisedReverse: false,      standardReverse: false,
  },
  irritable: {
    id: 'irritable',
    label: 'Irritable',
    revisedTopFace: 'calm', revisedBotFace: 'irritable',
    standardTopFace: 'calm', standardBotFace: 'irritable',
    revisedReverse: false,      standardReverse: false,
  },
  weary: {
    id: 'weary',
    label: 'Weary',
    revisedTopFace: 'calm', revisedBotFace: 'weary',
    standardTopFace: 'calm', standardBotFace: 'weary',
    revisedReverse: false,      standardReverse: false,
  },
  anxious: {
    id: 'anxious',
    label: 'Anxious',
    revisedTopFace: 'calm', revisedBotFace: 'anxious',
    standardTopFace: 'calm', standardBotFace: 'anxious',
    revisedReverse: false,      standardReverse: false,
  },
  cheerful: {
    id: 'cheerful',
    label: 'Cheerful',
    // Revised: cheerful face at top, calm at bottom
    revisedTopFace: 'cheerful', revisedBotFace: 'calm',
    // Standard: calm at top, cheerful at bottom
    standardTopFace: 'calm', standardBotFace: 'cheerful',
    revisedReverse: true,       standardReverse: false,
  },
  lively: {
    id: 'lively',
    label: 'Lively',
    // Revised: lively face at top, calm at bottom
    revisedTopFace: 'lively', revisedBotFace: 'calm',
    // Standard: calm at top, lively at bottom
    standardTopFace: 'calm',  standardBotFace: 'lively',
    revisedReverse: true,        standardReverse: false,
  },
};

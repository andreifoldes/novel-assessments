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
 *   - 'happy' and 'energetic' have the positive face at TOP (not neutral)
 *   - All negative items retain neutral at top in both modes
 *
 * Scoring convention: 0 = top of scale, 100 = bottom of scale.
 * For negative items: 0 = neutral (no distress), 100 = max distress.
 * For happy/energetic in revised mode: 0 = max positive, 100 = neutral → reverse-code.
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
  afraid: {
    id: 'afraid',
    label: 'Afraid',
    revisedTopFace: 'neutral', revisedBotFace: 'afraid',
    standardTopFace: 'neutral', standardBotFace: 'afraid',
    revisedReverse: false,      standardReverse: false,
  },
  confused: {
    id: 'confused',
    label: 'Confused',
    revisedTopFace: 'neutral', revisedBotFace: 'confused',
    standardTopFace: 'neutral', standardBotFace: 'confused',
    revisedReverse: false,      standardReverse: false,
  },
  sad: {
    id: 'sad',
    label: 'Sad',
    revisedTopFace: 'neutral', revisedBotFace: 'sad',
    standardTopFace: 'neutral', standardBotFace: 'sad',
    revisedReverse: false,      standardReverse: false,
  },
  angry: {
    id: 'angry',
    label: 'Angry',
    revisedTopFace: 'neutral', revisedBotFace: 'angry',
    standardTopFace: 'neutral', standardBotFace: 'angry',
    revisedReverse: false,      standardReverse: false,
  },
  tired: {
    id: 'tired',
    label: 'Tired',
    revisedTopFace: 'neutral', revisedBotFace: 'tired',
    standardTopFace: 'neutral', standardBotFace: 'tired',
    revisedReverse: false,      standardReverse: false,
  },
  tense: {
    id: 'tense',
    label: 'Tense',
    revisedTopFace: 'neutral', revisedBotFace: 'tense',
    standardTopFace: 'neutral', standardBotFace: 'tense',
    revisedReverse: false,      standardReverse: false,
  },
  happy: {
    id: 'happy',
    label: 'Happy',
    // Revised: happy face at top, neutral at bottom
    revisedTopFace: 'happy',   revisedBotFace: 'neutral',
    // Standard: neutral at top, happy at bottom
    standardTopFace: 'neutral', standardBotFace: 'happy',
    revisedReverse: true,       standardReverse: false,
  },
  energetic: {
    id: 'energetic',
    label: 'Energetic',
    // Revised: energetic face at top, neutral at bottom
    revisedTopFace: 'energetic', revisedBotFace: 'neutral',
    // Standard: neutral at top, energetic at bottom
    standardTopFace: 'neutral',  standardBotFace: 'energetic',
    revisedReverse: true,        standardReverse: false,
  },
};

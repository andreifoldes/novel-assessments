/**
 * URL parameter parser for MoodLine-OS.
 *
 * Supported parameters:
 *   items      comma-separated emotion IDs, default = all 8
 *   mode       "revised" (default) | "standard"
 *   randomize  "true" | "false" (default false)
 *   labels     "words" (default) | "no-words"
 *   faces      asset subfolder under public/, default = "faces"
 *              e.g. ?faces=noto or ?faces=ai-drawn
 */

export type ItemId =
  | 'scared'
  | 'muddled'
  | 'unhappy'
  | 'irritable'
  | 'weary'
  | 'anxious'
  | 'cheerful'
  | 'lively';

export type Mode = 'revised' | 'standard';
export type LabelMode = 'words' | 'no-words';

export interface AssessmentParams {
  items: ItemId[];
  mode: Mode;
  randomize: boolean;
  labels: LabelMode;
  /** Subfolder under public/ containing the face SVGs, e.g. "faces", "noto", "ai-drawn" */
  faceSet: string;
}

const ALL_ITEMS: ItemId[] = [
  'scared', 'muddled', 'unhappy', 'irritable', 'weary', 'anxious', 'cheerful', 'lively',
];

/** Fisher-Yates in-place shuffle */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function parseParams(): AssessmentParams {
  const p = new URLSearchParams(window.location.search);

  // --- items ---
  const itemsRaw = p.get('items');
  let items: ItemId[];
  if (itemsRaw) {
    const requested = itemsRaw.split(',').map(s => s.trim().toLowerCase());
    items = requested.filter((s): s is ItemId => ALL_ITEMS.includes(s as ItemId));
    if (items.length === 0) {
      console.warn('[MoodLine-OS] No valid item IDs found in ?items param; using all items.');
      items = [...ALL_ITEMS];
    }
  } else {
    items = [...ALL_ITEMS];
  }

  // --- mode ---
  const modeRaw = p.get('mode')?.toLowerCase();
  const mode: Mode = modeRaw === 'standard' ? 'standard' : 'revised';

  // --- randomize ---
  const randomize = p.get('randomize')?.toLowerCase() === 'true';
  if (randomize) shuffle(items);

  // --- labels ---
  const labelsRaw = p.get('labels')?.toLowerCase();
  const labels: LabelMode = labelsRaw === 'no-words' ? 'no-words' : 'words';

  // --- faces ---
  const facesRaw = p.get('faces')?.trim();
  // Strip leading/trailing slashes and fall back to the default folder name
  const faceSet = facesRaw ? facesRaw.replace(/^\/+|\/+$/g, '') : 'faces';

  return { items, mode, randomize, labels, faceSet };
}

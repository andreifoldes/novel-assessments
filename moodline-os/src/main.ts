/**
 * MoodLine-OS — main entry point.
 *
 * Flow: InstructionScene → ItemScene × N → CompleteScene
 *
 * URL parameters control which items are shown, mode (revised vs standard),
 * presentation order (randomized or canonical), and label mode (words / no-words).
 */

import { parseParams } from './urlParams';
import { ITEMS } from './items';
import { computeResults } from './scoring';
import type { ItemResponse } from './scoring';
import { InstructionScene } from './scenes/InstructionScene';
import { ItemScene } from './scenes/ItemScene';
import { CompleteScene } from './scenes/CompleteScene';

const app = document.getElementById('app') as HTMLElement;
const params = parseParams();
const responses: ItemResponse[] = [];

const FACE_NAMES = ['calm', 'scared', 'muddled', 'unhappy', 'irritable', 'weary', 'anxious', 'cheerful', 'lively'];

/** Preload all face SVGs so they're in the browser cache before any scene renders. */
function preloadFaces(): Promise<void> {
  const promises = FACE_NAMES.map(name => new Promise<void>(resolve => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // don't block on error
    img.src = `${import.meta.env.BASE_URL}${params.faceSet}/${name}.svg`;
  }));
  return Promise.all(promises).then(() => undefined);
}

function showInstruction(): void {
  const scene = new InstructionScene(app, params, () => {
    scene.destroy();
    showItem(0);
  });
  scene.render();
}

function showItem(index: number): void {
  const itemId = params.items[index];
  if (!itemId || !(itemId in ITEMS)) {
    showComplete();
    return;
  }

  const scene = new ItemScene(app, {
    item: itemId,
    mode: params.mode,
    labels: params.labels,
    faceSet: params.faceSet,
    index,
    total: params.items.length,
    onNext: (response) => {
      responses.push(response);
      const next = index + 1;
      if (next < params.items.length) {
        showItem(next);
      } else {
        showComplete();
      }
    },
  });
  scene.render();
}

function showComplete(): void {
  const results = computeResults(responses, {
    mode: params.mode,
    labels: params.labels,
    randomize: params.randomize,
    itemOrder: params.items,
  });
  const scene = new CompleteScene(app, results);
  scene.render();
}

// Preload all faces then kick off
preloadFaces().then(() => showInstruction());

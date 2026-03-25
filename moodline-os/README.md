# MoodLine-OS — Visual Analog Mood Assessment

Open-source visual analog mood assessment using emoji-based faces (Noto Emoji, Apache 2.0).

> **Disclaimer:** This project is an independent implementation of the generic Visual Analog Scale (VAS) method for mood tracking. It is not affiliated with, endorsed by, or a derivative of the Visual Analog Mood Scales (VAMS) published by PAR, Inc.

## Attributions

Emoji artwork provided by [Noto Emoji](https://github.com/googlefonts/noto-emoji) by Google, licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). See `../shared/faces/LICENSE-noto-emoji.txt`.

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle → dist/
npm run preview    # preview production build
```

## URL Parameters

Control the assessment via URL query parameters:

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `items` | comma-list from: `afraid,confused,sad,angry,tired,tense,happy,energetic` | all 8 | Which items to show (and in what order) |
| `mode` | `revised` \| `standard` | `revised` | Face polarity. In revised mode, happy/energetic have the positive face at **top**; in standard mode, neutral is always at top. |
| `randomize` | `true` \| `false` | `false` | Randomize item presentation order |
| `labels` | `words` \| `no-words` | `words` | Show/hide emotion word labels (aphasia-friendly mode) |

### Example URLs

```
# Default: all 8 items, revised mode, fixed order, with word labels
http://localhost:5173/

# Randomized order, no labels (aphasia-friendly)
http://localhost:5173/?randomize=true&labels=no-words

# Positive items only, standard polarity
http://localhost:5173/?items=happy,energetic&mode=standard

# Single item
http://localhost:5173/?items=sad
```

## Scoring

- **Raw score**: 0 (top of scale) → 100 (bottom of scale)
- **Adjusted score**: Reverse-coded for positive items in revised mode (`100 − raw`)
- **Total score**: Sum of all adjusted scores
- **Subscores** (only when all 8 items present):
  - Negative Mood: afraid + confused + sad + angry + tense
  - Energy: tired + energetic
  - Happiness: happy

## Face Polarity (Revised vs Standard)

In **revised** mode, happy and energetic items have the positive face at the top (neutral at bottom). All other items have neutral at top in both modes.

| Item | Standard | Revised |
|------|---------|---------|
| afraid, confused, sad, angry, tired, tense | neutral ↑ / emotion ↓ | neutral ↑ / emotion ↓ |
| happy | neutral ↑ / happy ↓ | happy ↑ / neutral ↓ |
| energetic | neutral ↑ / energetic ↓ | energetic ↑ / neutral ↓ |

## Output JSON

```json
{
  "responses": [
    {
      "id": "sad",
      "label": "Sad",
      "mode": "revised",
      "rawScore": 72,
      "adjustedScore": 72,
      "firstInteractionMs": 1840,
      "responseTimeMs": 4210,
      "order": 0
    }
  ],
  "totalScore": 72,
  "subscores": { "negativeMood": 72, "energy": null, "happiness": null },
  "completedAt": "2025-01-01T12:00:00.000Z",
  "params": { "mode": "revised", "labels": "words", "randomize": false, "itemOrder": ["sad"] }
}
```

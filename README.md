# Novel Assessments

Open-source cognitive and affective assessments for smartphone, tablet, and desktop.

## Assessments

### [MoodLine-OS](moodline-os/)

A mood rating tool that presents cartoon faces on a vertical line; the participant drags a marker to indicate how they feel right now. Designed for people with dementia and cognitive impairment — supports a `no-words` mode for those with communication difficulties.

**[▶ Live Demo](https://andreifoldes.github.io/novel-assessments/moodline-os/)**

Features:
- 8 mood items: Scared, Muddled, Unhappy, Irritable, Weary, Anxious, Cheerful, Lively
- Revised and standard administration modes
- Configurable via URL parameters (`?items=`, `?mode=`, `?randomize=`, `?labels=`)
- WCAG 2.1 AA accessible; keyboard navigable
- Swappable face asset sets via `?faces=` parameter

**Face asset sets:**

| Set | Demo | Style |
|-----|------|-------|
| `noto` (default) | [▶ Demo](https://andreifoldes.github.io/novel-assessments/moodline-os/) | Coloured cartoon SVGs |
| `claude-drawn` | [▶ Demo](https://andreifoldes.github.io/novel-assessments/moodline-os/?faces=claude-drawn) | Minimalist ink line-art (56×56, no colour fills) |

---

### [Reflection](reflection/)

A daily-reflection task in which the participant either records a voice memo or writes a free-text answer. Typed answers are accompanied by a privacy-preserving keystroke-dynamics log: every key is reduced to a class (letter, digit, backspace, ...) plus timings, and the characters themselves are never logged. No build step; plain ES modules.

**[▶ Live Demo](https://andreifoldes.github.io/novel-assessments/reflection/)**

Features:
- Voice memo with live waveform, pause/resume, playback review, redo and a configurable cap
- "Write instead" fallback with a soft keep-writing nudge based on active writing time
- Works on desktop and phone keyboards (physical keydown/keyup and soft-keyboard `beforeinput` capture)
- Optional picture shown only after the participant starts (picture-description variant)

URL parameters (all optional):

| Parameter | Meaning |
|---|---|
| `mode` | `voice`, `text` or `choice` (default: voice with a "write instead" button) |
| `prompt` | Instruction text (plain text) |
| `image` | http(s) image URL, shown once the task starts |
| `max_seconds` | Voice recording cap (default 300) |
| `target_seconds` | Active-writing nudge target (default 120) |
| `callback_url`, `token` | Where to send the result, and an id echoed with it |
| `embed=1` | Also post the m2c2 `m2c2:complete` message to the parent frame |

Result delivery on completion:
- **Voice:** `POST callback_url` with the raw audio as the body; `Content-Type` is the recording's MIME type, plus `X-Duration` (seconds) and `X-Token` headers.
- **Text:** `POST callback_url` with JSON `{"token", "data": {mode, transcript, keystroke_csv, capture_mode, active_writing_s, n_chars}}`. The log is a CSV with columns `class,hold,release,press` (seconds from the first event).
- Without `callback_url` the result is offered as downloads.

---

### [Affective Slider](affective-slider/)

A continuous two-dimensional self-assessment of emotional state (pleasure × arousal), implemented with the [m2c2kit](https://m2c2-project.github.io/m2c2kit-docs/) framework. Each dimension is rated on a 0–1 scale using a slider anchored by cartoon faces. Supports both horizontal and vertical orientations.

**[▶ Live Demo](https://andreifoldes.github.io/novel-assessments/affective-slider/)**

Features:
- Pleasure slider (Scared ↔ Cheerful) and Arousal slider (Weary ↔ Lively)
- Horizontal and vertical orientation support
- Continuous 0–1 output; both sliders must be interacted with before submission
- Built with m2c2kit for cross-device deployment

---

## Design Principles

- **Accessibility first**: WCAG 2.1 AA color contrast, ≥44px touch targets, screen-reader labels
- **Cross-device**: Responsive layouts for 320px → 1440px+; touch and mouse input
- **Minimal verbal load**: Each assessment supports a `no-words` mode for aphasia/communication difficulties
- **Researcher control**: URL parameters configure item selection, presentation order, and condition

## Shared Resources

- `shared/faces/` — SVG cartoon face assets (9 mood states)

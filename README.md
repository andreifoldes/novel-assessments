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
| `faces` (default) | [▶ Demo](https://andreifoldes.github.io/novel-assessments/moodline-os/) | Coloured cartoon SVGs |
| `claude-drawn` | [▶ Demo](https://andreifoldes.github.io/novel-assessments/moodline-os/?faces=claude-drawn) | Minimalist ink line-art (56×56, no colour fills) |

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

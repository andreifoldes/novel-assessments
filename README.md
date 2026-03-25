# Novel Assessments

A collection of short cognitive and affective web assessments, each as a self-contained subfolder mini web-app. Designed for use on smartphone, tablet, or desktop. Architecture inspired by the [m2c2kit](https://m2c2-project.github.io/m2c2kit-docs/) framework.

## Assessments

| Folder | Assessment | Reference |
|--------|-----------|-----------|
| [`moodline-os/`](./moodline-os/) | MoodLine-OS — Visual Analog Mood Assessment | Based on Kontou et al. (2012) |

## Design Principles

- **Accessibility first**: WCAG 2.1 AA color contrast, ≥44px touch targets, screen-reader labels
- **Cross-device**: Responsive layouts for 320px → 1440px+; touch and mouse input
- **Minimal verbal load**: Each assessment supports a `no-words` mode for aphasia/communication difficulties
- **Researcher control**: URL parameters configure item selection, presentation order, and condition

## Shared Resources

- `shared/design-tokens.ts` — color palette, typography, spacing
- `shared/faces/` — SVG cartoon face assets (9 mood states)

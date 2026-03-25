/**
 * Shared design tokens for novel-assessments.
 * Colors meet WCAG 2.1 AA contrast requirements.
 */

export const colors = {
  /** App background */
  bg: '#F8F9FA',
  /** Card / scene surface */
  surface: '#FFFFFF',
  /** Primary interactive color */
  primary: '#2B6CB0',
  /** Pressed / hover state */
  primaryDark: '#1A4A8A',
  /** Primary text — 14.7:1 on bg */
  text: '#1A202C',
  /** Secondary / muted text — 7.0:1 on bg */
  textMuted: '#4A5568',
  /** VAS track line */
  vasLine: '#718096',
  /** VAS draggable marker fill */
  markerFill: '#EBF8FF',
  /** VAS draggable marker border */
  markerBorder: '#2B6CB0',
  /** Subtle border */
  border: '#CBD5E0',
  /** Success / positive accent */
  positive: '#276749',
  /** Warning / negative accent */
  negative: '#9B2C2C',
  /** Disabled state */
  disabled: '#A0AEC0',
  /** Disabled text */
  disabledText: '#718096',
} as const;

export const typography = {
  /** Primary font stack — humanist, highly legible */
  fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  /** Item heading (emotion label) */
  sizeLg: '1.625rem',    // 26px
  /** Body / instruction text */
  sizeMd: '1.125rem',    // 18px
  /** VAS endpoint labels */
  sizeSm: '0.9375rem',   // 15px
  /** Progress indicator */
  sizeXs: '0.875rem',    // 14px

  weightRegular: '400',
  weightMedium: '500',
  weightBold: '700',
} as const;

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  xxl: '3rem',     // 48px
} as const;

/** Minimum touch target size (WCAG 2.5.5) */
export const touchTarget = 44; // px

/** VAS marker diameter */
export const markerSize = 48; // px

/** Face icon rendered size */
export const faceSize = 72; // px

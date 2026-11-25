/** Waveform helpers for the reflection recorder (no DOM, so they can be unit-tested). */

/**
 * Reduce the level samples of a whole recording to `n` bars: the peak of each slice, scaled so the
 * loudest bar is full height. Fewer samples than bars are stretched, so short recordings still fill
 * the width.
 */
export function binLevels(levels, n) {
  const out = new Array(n).fill(0);
  if (!levels.length || n <= 0) return out;
  for (let i = 0; i < n; i++) {
    const from = Math.floor((i * levels.length) / n);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / n));
    let peak = 0;
    for (let j = from; j < to && j < levels.length; j++) peak = Math.max(peak, levels[j]);
    out[i] = peak;
  }
  const max = Math.max(...out);
  return max > 0 ? out.map((v) => v / max) : out;
}

/** Playback position (seconds) for a tap at `x` on a waveform `width` wide. */
export function seekTime(x, width, duration) {
  if (!(width > 0) || !(duration > 0)) return 0;
  return Math.min(duration, Math.max(0, (x / width) * duration));
}

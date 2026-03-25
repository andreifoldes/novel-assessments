/**
 * Physical measurement utility: converts 100mm to CSS pixels.
 *
 * Strategy: inject a hidden element with CSS width: 10mm, read its
 * offsetWidth, multiply by 10. This is the most reliable cross-device
 * approach as the browser handles DPI/scaling.
 *
 * Result is cached after first call.
 */

let _cached: number | null = null;

export function get100mmPx(): number {
  if (_cached !== null) return _cached;

  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:10mm;height:1px;visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  const px10mm = probe.offsetWidth;
  document.body.removeChild(probe);

  _cached = px10mm * 10;
  return _cached;
}

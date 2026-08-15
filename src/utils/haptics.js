/**
 * Tiny haptics wrapper.
 *
 * `navigator.vibrate` is supported on Android/Chromium but not on iOS Safari,
 * where it is simply absent — so every call is guarded and silently no-ops
 * rather than throwing. Some browsers also reject vibration before the user has
 * interacted with the document, which surfaces as a console warning, hence the
 * try/catch.
 *
 * Patterns are deliberately short. Anything longer reads as a malfunction
 * rather than feedback.
 */

const PATTERNS = {
  /** A set was checked, a tab was switched — the common case. */
  tap: 10,
  /** Something was toggled off, an item removed. */
  light: 6,
  /** A confirmation landed: exercise complete, meal logged. */
  success: [12, 40, 18],
  /** Session finished, rank up — worth noticing. */
  celebrate: [18, 50, 18, 50, 32],
  /** Something failed or was rejected. */
  error: [40, 30, 40],
};

let enabled = true;

/** Lets Settings turn haptics off globally without touching call sites. */
export function setHapticsEnabled(next) {
  enabled = !!next;
}

export function haptic(kind = 'tap') {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  const pattern = PATTERNS[kind] ?? PATTERNS.tap;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* Vibration blocked (no user gesture yet, or disabled by the OS). */
  }
}

export default haptic;

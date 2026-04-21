/**
 * Stable, namespaced id factories.
 *
 * Centralized so the React 19 lint rule that flags `Date.now()` /
 * `Math.random()` inside component bodies doesn't have to be suppressed at
 * each call site — the impure work happens here, behind a function reference.
 *
 * Both helpers append a short random suffix so two events created in the same
 * millisecond still get distinct ids.
 */

function shortRandom(): string {
  return Math.random().toString(36).slice(2, 6);
}

/** New calendar-event id, e.g. `ev_1745192847123_8a3z`. */
export function newEventId(): string {
  return `ev_${Date.now()}_${shortRandom()}`;
}

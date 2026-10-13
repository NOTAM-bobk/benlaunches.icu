/**
 * Reduced-motion preference.
 *
 * Two things can ask for less animation: the visitor's operating system, and
 * the switch in their account settings. The account choice is remembered in
 * this browser so it applies on the first paint, before the account service has
 * answered.
 */
const PREF_KEY = "bi:pref-reduced-motion";

let accountChoice: boolean | null = null;

if (typeof window !== "undefined") {
  try {
    const stored = window.localStorage.getItem(PREF_KEY);
    accountChoice = stored === null ? null : stored === "true";
  } catch {
    /* private mode — fall back to the system preference */
  }
}

function systemPrefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Remember the account's choice; called when the account loads or saves. */
export function setReducedMotionPreference(value: boolean) {
  accountChoice = value;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREF_KEY, String(value));
  } catch {
    /* private mode — the choice just will not survive the reload */
  }
}

/** True when the account or the system has asked for less animation. */
export function prefersReducedMotion(): boolean {
  return accountChoice ?? systemPrefersReducedMotion();
}

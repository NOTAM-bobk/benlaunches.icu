import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const BEN_LAUNCHES_HOME = "https://www.benlaunches.icu/";
const LEGACY_HOME = "https://boringinternet.org/";
const LEGACY_HOSTS = new Set(["boringinternet.org", "www.boringinternet.org"]);

/**
 * A required first-visit choice shown on every full page load. There is no
 * backdrop, Escape, or close-button dismissal: visitors choose the new site or
 * explicitly continue with the legacy domain.
 */
export default function WelcomeGate() {
  const [open, setOpen] = useState(true);
  const dialogRef = useRef<HTMLElement>(null);
  const primaryActionRef = useRef<HTMLElement>(null);
  const isLegacyHost =
    typeof window !== "undefined" && LEGACY_HOSTS.has(window.location.hostname.toLowerCase());

  useEffect(() => {
    if (!open) return;

    const root = document.getElementById("root");
    const previousOverflow = document.body.style.overflow;
    const wasInert = root?.inert ?? false;

    document.body.style.overflow = "hidden";
    if (root) root.inert = true;
    primaryActionRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (root) root.inert = wasInert;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="welcome-gate-backdrop">
      <section
        ref={dialogRef}
        className="welcome-gate-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-gate-title"
        aria-describedby="welcome-gate-copy"
      >
        <p className="welcome-gate-eyebrow">A new chapter for the open web</p>
        <h1 id="welcome-gate-title" className="welcome-gate-title">
          Allow us to reintroduce ourselves.
        </h1>
        <p id="welcome-gate-copy" className="welcome-gate-copy">
          Our name is <strong>Ben Launches.</strong>
        </p>
        {isLegacyHost ? (
          <a ref={(element) => { primaryActionRef.current = element; }} className="welcome-gate-primary" href={BEN_LAUNCHES_HOME}>
            Continue to Ben Launches <span aria-hidden="true">→</span>
          </a>
        ) : (
          <button
            ref={(element) => { primaryActionRef.current = element; }}
            type="button"
            className="welcome-gate-primary"
            onClick={() => setOpen(false)}
          >
            Continue to Ben Launches <span aria-hidden="true">→</span>
          </button>
        )}
        {isLegacyHost ? (
          <button
            type="button"
            className="welcome-gate-legacy"
            onClick={() => setOpen(false)}
          >
            Continue to legacy
          </button>
        ) : (
          <a className="welcome-gate-legacy" href={LEGACY_HOME}>
            Continue to legacy
          </a>
        )}
      </section>
    </div>,
    document.body,
  );
}

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { SignInPromptContext } from "../lib/signInPrompt";

/**
 * The popup a signed-out visitor gets when they try something that needs an
 * account — saving a site, saving a collection. It says what they were doing,
 * offers the way in, and gets out of the way on Escape, a click outside, or
 * "Not now".
 */
export function SignInPromptProvider({ children }: { children: ReactNode }) {
  const [subject, setSubject] = useState<string | null>(null);
  const ask = useCallback((what = "save this") => setSubject(what), []);
  const close = useCallback(() => setSubject(null), []);

  // Escape closes it, and the page behind stops scrolling while it is up.
  useEffect(() => {
    if (subject === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [subject, close]);

  return (
    <SignInPromptContext.Provider value={ask}>
      {children}
      {subject !== null &&
        createPortal(
          /* Same sheet as the share dialog, so the two feel like one product. */
          <div
            className="share-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <section
              className="share-sheet signin-prompt"
              role="dialog"
              aria-modal="true"
              aria-labelledby="signin-prompt-title"
            >
              <div className="share-head">
                <div>
                  <span className="share-eyebrow">Your account</span>
                  <h2 id="signin-prompt-title">
                    Woppos, looks like u need to sign in to do that…
                  </h2>
                </div>
                <button type="button" className="pager" onClick={close} aria-label="Close this dialog">
                  ×
                </button>
              </div>

              <p className="signin-prompt-copy">
                To {subject}, you need an account. Signing in also keeps your votes and saved sites on
                every device — and takes about ten seconds.
              </p>

              <div className="signin-prompt-actions">
                <Link to="/auth" className="btn accent" onClick={close}>
                  Sign in or create an account
                </Link>
                <button type="button" className="btn ghost" onClick={close}>
                  Not now
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </SignInPromptContext.Provider>
  );
}

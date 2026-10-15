import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { Highlight } from "./Highlight";
import { SiteIcon } from "./SiteIcon";
import { searchSites, sites } from "../lib/siteData";
import { siteDomain } from "../lib/siteTile";

/** How many quick matches the popup lists before sending you to the directory. */
const PREVIEW = 7;

/**
 * The icon-only search button in the header, and the popup it opens. The popup
 * is fixed to the viewport, so it covers whatever screen you are on without
 * navigating away, and ⌘K / Ctrl+K opens it from anywhere. It is portalled to
 * the body because the sticky header is its own stacking context: inside it,
 * the page's own floating buttons (back to top) would paint over the popup.
 */
export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // ⌘K / Ctrl+K opens the popup, wherever the visitor is.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // The field is the whole point of the popup, so it takes focus as it opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes it, and the page behind stops scrolling while it is up.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const matches = useMemo(() => (query.trim() ? searchSites(query) : []), [query]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function goTo(path: string) {
    close();
    navigate(path);
  }

  function runSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    goTo(trimmed ? `/?q=${encodeURIComponent(trimmed)}#explore` : "/#explore");
  }

  const trimmed = query.trim();

  return (
    <>
      <button
        type="button"
        className="header-icon-btn"
        aria-label="Search sites"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Search sites (⌘K)"
        onClick={() => (open ? close() : setOpen(true))}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <circle cx="8.4" cy="8.4" r="5.4" />
          <line x1="12.6" y1="12.6" x2="17.4" y2="17.4" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            className="search-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Search sites"
          >
            <button
              type="button"
              className="search-backdrop"
              aria-label="Close search"
              onClick={close}
            />
            <div className="search-dialog">
              <form className="search-form" role="search" onSubmit={runSearch}>
                <span className="search-form-icon" aria-hidden="true">
                  ⌕
                </span>
                <label htmlFor="header-search" className="sr-only">
                  Search sites by title, tag, or description
                </label>
                <input
                  id="header-search"
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${sites.length} sites`}
                />
                <button type="submit" className="search-form-go">
                  Search
                </button>
              </form>

              {!trimmed ? (
                <p className="search-hint">
                  Search by name, tag, or category. <kbd>Esc</kbd> closes this.
                </p>
              ) : matches.length === 0 ? (
                <p className="search-empty">No sites match “{trimmed}”.</p>
              ) : (
                <div className="search-results">
                  {matches.slice(0, PREVIEW).map((site) => (
                    <button
                      key={site.id}
                      type="button"
                      className="sidenav-result search-result"
                      onClick={() => goTo(`/sites/${site.slug}`)}
                    >
                      <SiteIcon site={site} size={24} label={false} />
                      <span className="sidenav-result-copy">
                        <span className="sidenav-result-name">
                          <Highlight text={site.name} query={query} />
                        </span>
                        <span className="sidenav-result-domain">{siteDomain(site.url)}</span>
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="search-all"
                    onClick={() => goTo(`/?q=${encodeURIComponent(trimmed)}#explore`)}
                  >
                    {matches.length > PREVIEW
                      ? `See all ${matches.length} results →`
                      : "Search the full directory →"}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

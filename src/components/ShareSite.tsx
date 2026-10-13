import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { SiteIcon } from "./SiteIcon";
import { BrandIcon } from "./BrandIcons";
import { SHARE_ICON_COLORS } from "../lib/shareBrands";
import { useAuth } from "../lib/auth";
import { siteName, type Site } from "../lib/siteData";
import { siteDomain } from "../lib/siteTile";

/**
 * The social targets in the share sheet. Each one is a plain link that opens the
 * platform's own compose screen with the words already in it — nothing is posted
 * on the visitor's behalf, and none of them load a script or a tracker.
 *
 * Each tile shows the platform's own mark, tinted with its brand colour, and
 * `mark` stays as a monogram fallback for anything without a glyph yet.
 */
const TARGETS: ReadonlyArray<{ id: string; label: string; mark: string; href: (text: string, url: string, name: string) => string }> = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    mark: "WA",
    href: (text) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    id: "email",
    label: "Email",
    mark: "@",
    href: (text, _url, name) =>
      `mailto:?subject=${encodeURIComponent(`${name} on ${siteName}`)}&body=${encodeURIComponent(text)}`,
  },
  {
    id: "x",
    label: "X",
    mark: "X",
    href: (text, url, name) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${name} — ${text}`)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: "bluesky",
    label: "Bluesky",
    mark: "BS",
    href: (text) => `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`,
  },
  {
    id: "threads",
    label: "Threads",
    mark: "TH",
    href: (text) => `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    mark: "FB",
    href: (_text, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    mark: "IN",
    href: (_text, url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: "reddit",
    label: "Reddit",
    mark: "RD",
    href: (_text, url, name) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(name)}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    mark: "TG",
    href: (_text, url, name) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(name)}`,
  },
  {
    id: "hacker-news",
    label: "Hacker News",
    mark: "HN",
    href: (_text, url, name) =>
      `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(url)}&t=${encodeURIComponent(name)}`,
  },
];

type CopyState = "idle" | "copied" | "failed";

/** Two offset pages: the "copy this link" mark. */
function CopyGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1.6" />
      <path d="M13 7V4.6A1.6 1.6 0 0 0 11.4 3h-8A1.6 1.6 0 0 0 1.8 4.6v8A1.6 1.6 0 0 0 3.4 14.2H6" />
    </svg>
  );
}

/** The tick the copy button turns into once the link is on the clipboard. */
function TickGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 10.6l4 4 8-9" />
    </svg>
  );
}

/**
 * The share button for a listing, and the sheet it opens: text message, the usual
 * social platforms, and a copy-the-link action. Every action is a link or a
 * clipboard write that happens in the browser — there is no share service behind
 * this and nothing leaves the page until the visitor picks a target.
 */
export function ShareSite({ site, pageUrl }: { site: Site; pageUrl: string }) {
  const { user, toggleSaved } = useAuth();
  const [open, setOpen] = useState(false);
  const [copy, setCopy] = useState<CopyState>("idle");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);

  const domain = siteDomain(site.url);
  const saved = Boolean(user?.saved.includes(site.slug));

  /** One sentence that reads well dropped into a text or a post. */
  const message = `${site.name} — ${site.description.replace(/\s+/g, " ").trim()} ${pageUrl}`;
  const smsHref = `sms:?&body=${encodeURIComponent(message)}`;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  /*
    The sheet scrolls on a short screen, so the copy result is brought into view
    instead of landing below the fold. The button itself also flips to "Link
    copied", which is visible wherever the sheet happens to be scrolled.
  */
  useEffect(() => {
    if (copy === "idle") return;
    feedbackRef.current?.scrollIntoView({ block: "nearest" });
  }, [copy]);

  function close() {
    setOpen(false);
    setCopy("idle");
    triggerRef.current?.focus();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopy("copied");
      return;
    } catch {
      /* Older browsers, or a page served over plain http. Fall through. */
    }
    try {
      const field = document.createElement("textarea");
      field.value = pageUrl;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(field);
      setCopy(ok ? "copied" : "failed");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <>
      <button type="button" className="btn ghost share-trigger" onClick={() => setOpen(true)} ref={triggerRef}>
        <span className="share-trigger-mark" aria-hidden="true">↗</span> Share
      </button>

      {open &&
        createPortal(
          /*
            Portaled to <body> for the same reason the report dialog is: the slide
            transition on the route pane leaves a transform behind, and a
            transformed ancestor becomes the containing block for `position: fixed`.
          */
          <div
            className="share-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <section
              className="share-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`share-title-${site.slug}`}
            >
              <div className="share-head">
                <div>
                  <span className="share-eyebrow">Send it on</span>
                  <h2 id={`share-title-${site.slug}`}>Share {site.name}</h2>
                </div>
                <button
                  type="button"
                  className="pager"
                  onClick={close}
                  ref={closeRef}
                  aria-label="Close the share screen"
                >
                  ×
                </button>
              </div>

              <div className="share-preview">
                <SiteIcon site={site} size={40} label={false} />
                <div className="share-preview-copy">
                  <strong>{site.name}</strong>
                  <span>{domain}</span>
                </div>
                <span className="share-preview-meta">{siteName}</span>
              </div>

              <a className="share-sms" href={smsHref}>
                <span className="share-target-mark" aria-hidden="true">
                  <BrandIcon id="sms" />
                </span>
                <span className="share-sms-copy">
                  <strong>Text message</strong>
                  <small>Opens your messages app with the link ready to send.</small>
                </span>
                <span aria-hidden="true">→</span>
              </a>

              <ul className="share-targets" aria-label="Share on another platform">
                {TARGETS.map((target) => (
                  <li key={target.id}>
                    <a
                      className="share-target"
                      href={target.href(message, pageUrl, site.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span
                        className="share-target-mark"
                        aria-hidden="true"
                        style={{ color: SHARE_ICON_COLORS[target.id] ?? "var(--ink)" }}
                      >
                        <BrandIcon id={target.id} fallback={target.mark} />
                      </span>
                      <span className="share-target-label">{target.label}</span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className="share-keep">
                <button type="button" className="btn accent share-copy" onClick={() => void copyLink()}>
                  {copy === "copied" ? <TickGlyph /> : <CopyGlyph />}
                  {copy === "copied" ? "Link copied" : "Copy link"}
                </button>
                {user ? (
                  <button type="button" className="btn ghost" onClick={() => void toggleSaved(site.slug)}>
                    {saved ? "Saved ✓" : "Save to my list"}
                  </button>
                ) : (
                  <Link to="/auth" className="btn ghost" onClick={close}>
                    Sign in to save it
                  </Link>
                )}
                {/*
                  The copy result sits next to the button that caused it: on a
                  short screen the fine print at the foot of the sheet can be
                  below the fold, and feedback nobody can see is no feedback.
                */}
                {copy !== "idle" && (
                  <p className="share-feedback" role="status" ref={feedbackRef}>
                    {copy === "copied"
                      ? "The link is on your clipboard."
                      : `Copying was blocked — the link is ${pageUrl}`}
                  </p>
                )}
              </div>

              <p className="share-note">
                Nothing is posted for you: each option opens its own screen with the words already
                in it.
              </p>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}

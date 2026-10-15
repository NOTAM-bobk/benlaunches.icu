import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SiteIcon } from "./SiteIcon";
import { categoryLabel, siteName, siteUrl, type Site } from "../lib/siteData";
import { formatDate } from "../lib/posts";
import { siteDomain } from "../lib/siteTile";

/** The card's fixed words, so the canvas and the DOM always agree. */
const CARD = {
  background: "#fff7ee",
  ink: "#1a120b",
  muted: "#6f4f36",
  accent: "#d9601f",
  onAccent: "#fff7ee",
};

/** Wraps text into lines that fit a width, on the canvas and in the card. */
function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draws the launch card onto a canvas and hands back a PNG, so the card can be
 * downloaded and posted anywhere. Nothing leaves the browser.
 */
function drawCard(site: Site): Promise<Blob | null> {
  return new Promise((resolve) => {
    const width = 1200;
    const height = 630;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(null);
      return;
    }

    ctx.fillStyle = CARD.background;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = CARD.ink;
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    // The accent cap that carries the badge.
    ctx.fillStyle = CARD.accent;
    ctx.fillRect(6, 6, width - 12, 92);

    const font = "system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillStyle = CARD.onAccent;
    ctx.font = `800 34px ${font}`;
    ctx.fillText(site.featured ? "FEATURED LAUNCH" : "NEW LAUNCH", 64, 68);

    ctx.textAlign = "right";
    ctx.font = `700 30px ${font}`;
    ctx.fillText(siteName.toUpperCase(), width - 64, 68);
    ctx.textAlign = "left";

    ctx.fillStyle = CARD.ink;
    ctx.font = `800 86px ${font}`;
    const nameLines = wrapText(ctx, site.name, width - 128).slice(0, 2);
    let y = 220;
    for (const line of nameLines) {
      ctx.fillText(line, 64, y);
      y += 96;
    }

    ctx.fillStyle = CARD.muted;
    ctx.font = `400 34px ${font}`;
    const body = (site.extras?.tagline || site.description || "").trim();
    for (const line of wrapText(ctx, body, width - 128).slice(0, 3)) {
      ctx.fillText(line, 64, y + 10);
      y += 48;
    }

    ctx.fillStyle = CARD.ink;
    ctx.font = `700 28px ${font}`;
    ctx.fillText(siteDomain(site.url), 64, height - 70);

    ctx.textAlign = "right";
    ctx.fillStyle = CARD.muted;
    ctx.font = `700 28px ${font}`;
    const meta = [
      categoryLabel(site.category),
      site.launched ? formatDate(site.launched) : "",
    ]
      .filter(Boolean)
      .join("  ·  ");
    ctx.fillText(meta, width - 64, height - 70);
    ctx.textAlign = "left";

    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function copyText(value: string): Promise<boolean> {
  return navigator.clipboard
    .writeText(value)
    .then(() => true)
    .catch(() => false);
}

/**
 * "Share launch card": a card built from a listing that can be copied, shared
 * through the browser, or downloaded as a PNG.
 */
export function ShareLaunchCard({ site, className = "btn ghost" }: { site: Site; className?: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const pageUrl = `${siteUrl}/sites/${site.slug}`;
  const domain = siteDomain(site.url);
  const tagline = (site.extras?.tagline || site.description || "").trim();
  const caption = `${site.name} — ${tagline}\n${pageUrl}`;
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function";

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function copyLink() {
    setStatus((await copyText(pageUrl)) ? "Link copied." : `Copying was blocked — the link is ${pageUrl}`);
  }

  async function copyCaption() {
    setStatus((await copyText(caption)) ? "Caption copied." : "Copying the caption was blocked.");
  }

  async function share() {
    if (!canShare) return;
    try {
      await navigator.share({ title: site.name, text: tagline, url: pageUrl });
      setStatus("Shared.");
    } catch {
      /* the visitor dismissed the sheet */
    }
  }

  async function download() {
    setBusy(true);
    setStatus("Rendering the card…");
    try {
      const blob = await drawCard(site);
      if (!blob) {
        setStatus("This browser could not render the card.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${site.slug}-launch-card.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatus("Card downloaded.");
    } catch {
      setStatus("The card could not be downloaded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Share launch card
      </button>

      {open &&
        createPortal(
          <div
            className="share-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <section className="share-sheet launch-card-sheet" role="dialog" aria-modal="true" aria-label={`Launch card for ${site.name}`}>
              <div className="share-head">
                <div>
                  <span className="share-eyebrow">Shareable launch card</span>
                  <h2>{site.name}</h2>
                </div>
                <button
                  type="button"
                  className="pager"
                  onClick={() => setOpen(false)}
                  ref={closeRef}
                  aria-label="Close the launch card"
                >
                  ×
                </button>
              </div>

              {/* The card itself: the same shape the PNG download draws. */}
              <div className="launch-card-preview" aria-hidden="true">
                <span className="launch-card-preview-cap">
                  {site.featured ? "Featured launch" : "New launch"}
                </span>
                <div className="launch-card-preview-body">
                  <SiteIcon site={site} size={44} label={false} />
                  <div className="launch-card-preview-copy">
                    <strong>{site.name}</strong>
                    <span>{domain}</span>
                  </div>
                </div>
                <p className="launch-card-preview-line">{tagline}</p>
                <div className="launch-card-preview-foot">
                  <span>{categoryLabel(site.category)}</span>
                  <span>{site.launched ? formatDate(site.launched) : "Just added"}</span>
                </div>
              </div>

              <div className="share-keep launch-card-actions">
                <button type="button" className="btn accent" onClick={() => void download()} disabled={busy}>
                  {busy ? "Preparing…" : "Download PNG"}
                </button>
                <button type="button" className="btn ghost" onClick={() => void copyLink()}>
                  Copy link
                </button>
                <button type="button" className="btn ghost" onClick={() => void copyCaption()}>
                  Copy caption
                </button>
                {canShare && (
                  <button type="button" className="btn ghost" onClick={() => void share()}>
                    Share…
                  </button>
                )}
              </div>

              {status && (
                <p className="share-feedback" role="status">
                  {status}
                </p>
              )}

              <p className="share-note">
                The card is drawn in this browser. Nothing is uploaded, and nothing is posted for you.
              </p>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}

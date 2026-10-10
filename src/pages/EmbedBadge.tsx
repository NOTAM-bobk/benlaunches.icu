import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { BoostTraffic } from "../components/BoostTraffic";
import { siteName } from "../lib/siteData";

function safeHttpUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** A lightweight, standalone badge intended to be displayed inside a partner site's iframe. */
export default function EmbedBadge() {
  const [params] = useSearchParams();
  /*
   * Inside a partner's iframe this stays a plain badge — a page full of prices
   * on someone else's site would be rude. Opened directly (the "badge card
   * page"), it can also show the paid options.
   */
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    try {
      setStandalone(window.self === window.top);
    } catch {
      setStandalone(false);
    }
  }, []);
  const name = params.get("name")?.trim().slice(0, 100) || "A website";
  const submittedUrl = safeHttpUrl(params.get("url"));
  const displayHost = submittedUrl?.hostname.replace(/^www\./, "") ?? "";
  const isListed = params.get("status") === "listed";
  const label = isListed ? "As seen on" : "Submitted to";

  return (
    <main className={standalone ? "embed-root embed-root-standalone" : "embed-root"}>
      <a
        href="https://www.benlaunches.icu/"
        target="_top"
        rel="noopener noreferrer"
        className="embed-badge"
        aria-label={`${name}, ${label} ${siteName}`}
      >
        <span className="embed-badge-mark" aria-hidden="true">b.</span>
        <span className="embed-badge-copy">
          <span className="embed-badge-kicker">{label}</span>
          <span className="embed-badge-title">{siteName}</span>
          <span className="embed-badge-site">{displayHost || name}</span>
        </span>
        <span className="embed-badge-arrow" aria-hidden="true">↗</span>
      </a>
      {standalone && (
        <div className="embed-boost">
          <BoostTraffic id="embed-boost" />
          <p className="embed-back">
            <Link to="/">← Back to the directory</Link>
          </p>
        </div>
      )}
    </main>
  );
}

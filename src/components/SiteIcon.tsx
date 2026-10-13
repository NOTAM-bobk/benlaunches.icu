import { useEffect, useState } from "react";
import { siteInitials, siteTileStyle } from "../lib/siteTile";
import { serverIconUrl } from "../lib/shots";

/**
 * The site's real icon, in order of preference:
 *   1. an icon rendered server-side at the exact size we display (it also picks
 *      up icons that are only declared in the page's <head>, and it 404s
 *      cleanly when a domain has no icon at all)
 *   2. the site's own /favicon.ico
 *   3. a keyless icon lookup for the domain
 *   4. a monogram tile in the brand palette
 */
function attemptsFor(url: string, size: number): string[] {
  try {
    const { origin, hostname } = new URL(url);
    return [
      serverIconUrl(url, size),
      `${origin}/favicon.ico`,
      `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
    ];
  } catch {
    return [];
  }
}

/** The parts of a site the icon needs — directory sites and launches both fit. */
export interface SiteIconSource {
  name: string;
  slug: string;
  url: string;
}

export function SiteIcon({
  site,
  size = 40,
  label = true,
}: {
  site: SiteIconSource;
  size?: number;
  label?: boolean;
}) {
  const [step, setStep] = useState(0);
  const attempts = attemptsFor(site.url, size);

  useEffect(() => {
    setStep(0);
  }, [site.url]);

  const src = step < attempts.length ? attempts[step] : null;
  const boxStyle = { width: size, height: size };

  if (src === null) {
    return (
      <span
        className="site-tile"
        style={{ ...siteTileStyle(site.slug), ...boxStyle, fontSize: Math.max(10, size * 0.32) }}
        aria-hidden="true"
      >
        {siteInitials(site.name)}
      </span>
    );
  }

  return (
    <span className="site-icon" style={boxStyle} title={label ? site.name : undefined}>
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setStep((current) => current + 1)}
      />
    </span>
  );
}

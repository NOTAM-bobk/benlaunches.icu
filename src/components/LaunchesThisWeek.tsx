import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { launchesThisWeek, launchesTitle } from "../lib/launches";
import { formatDate } from "../lib/posts";
import { prefersReducedMotion } from "../lib/motion";
import { siteDomain } from "../lib/siteTile";
import { SiteIcon } from "./SiteIcon";

/** How long a launch stays up before the row slides to the next one. */
const ROTATE_MS = 4000;

/** The ticker is derived from listing dates, with a seven-day window and five-site cap. */
export function LaunchesThisWeek() {
  const launches = useMemo(() => launchesThisWeek(), []);
  const count = launches.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="launches-heading">
      <div
        className="sec-head flex items-end justify-between gap-4 border-b pb-3"
        style={{ borderColor: "var(--rule)" }}
      >
        <h2 id="launches-heading" className="text-xl font-bold tracking-[-0.01em]">
          {launchesTitle}
        </h2>
        <span className="hidden sm:inline text-[11px] font-mono" style={{ color: "var(--muted)" }}>
          {count === 1 ? "1 launch this week" : `${count} launches this week`}
        </span>
      </div>

      <div
        className="launch-ticker"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <ol className="launch-track" style={{ "--launch-index": index } as CSSProperties}>
          {launches.map((launch, itemIndex) => (
            <li
              key={launch.id}
              className="launch-row"
              aria-hidden={itemIndex === index ? undefined : true}
            >
              <SiteIcon site={launch} size={40} label={false} />
              <div className="launch-copy">
                <a
                  href={launch.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="launch-name"
                  tabIndex={itemIndex === index ? undefined : -1}
                >
                  {launch.name}
                </a>
                <p className="launch-line">{launch.description}</p>
              </div>
              <div className="launch-meta">
                <span className="launch-domain">{siteDomain(launch.url)}</span>
                {launch.launched && (
                  <span className="launch-date">Launched {formatDate(launch.launched)}</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {count > 1 && (
        <div className="carousel-dots" aria-label="Choose a launch">
          {launches.map((launch, itemIndex) => (
            <button
              key={launch.id}
              type="button"
              className={`carousel-dot${itemIndex === index ? " carousel-dot-active" : ""}`}
              aria-label={`Show ${launch.name}`}
              aria-current={itemIndex === index ? "true" : undefined}
              onClick={() => setIndex(itemIndex)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

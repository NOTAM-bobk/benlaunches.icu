import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import { sites, type Site } from "../lib/siteData";
import { siteDomain } from "../lib/siteTile";
import { castVote, markVoted, readLocalCounts, writeLocalCount } from "../lib/votes";
import { ReportProblem } from "../components/ReportProblem";

function pickOne<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

/** Two listed sites, never the same one twice, and ideally from different corners. */
function drawPair(exclude: string[] = []): [Site, Site] {
  const pool = sites.filter((site) => !exclude.includes(site.slug));
  const first = pickOne(pool);
  const rest = pool.filter((site) => site.slug !== first.slug);
  const elsewhere = rest.filter((site) => site.category !== first.category);
  return [first, pickOne(elsewhere.length > 0 ? elsewhere : rest)];
}

/**
 * "This or that": two sites framed side by side, one vote for whichever is
 * better. The winner gets the same vote the trending list counts, and once a
 * vote is in the page offers a fresh pair.
 *
 * On a phone the page becomes a verdict bar — back button, "Which one is
 * better?", Skip — over two stacked, full-width panels, each with its own
 * preview controls and a wide "Vote for …" button. The wide layout keeps the
 * toolbar and the framed pair as they were.
 */
export default function ThisOrThat() {
  const [pair, setPair] = useState<[Site, Site]>(() => drawPair());
  const [lastVote, setLastVote] = useState<Site | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>(() => readLocalCounts());
  // Remounting an iframe is the only way to reload a framed site, so each
  // preview keeps a nonce that the header's refresh button bumps.
  const [frameNonce, setFrameNonce] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  const [left, right] = pair;
  const enoughSites = sites.length >= 2;

  function voteFor(site: Site) {
    // Count it the way the trending list does: shared when the Worker is
    // configured, kept in this browser otherwise. Advance immediately so each
    // click feels like a quick, continuous round rather than a two-step flow.
    const base = counts[site.slug] ?? site.trending ?? 0;
    const optimistic = base + 1;
    setCounts((current) => ({ ...current, [site.slug]: optimistic }));
    markVoted(site.slug);
    writeLocalCount(site.slug, optimistic);
    setLastVote(site);
    setPair(drawPair([left.slug, right.slug]));
    void castVote(site.slug, "up").then((shared) => {
      if (shared == null) return;
      writeLocalCount(site.slug, shared);
      setCounts((current) => ({ ...current, [site.slug]: shared }));
    });
  }

  function newPair() {
    setPair(drawPair([left.slug, right.slug]));
    setLastVote(null);
  }

  function reloadFrame(slug: string) {
    setFrameNonce((current) => ({ ...current, [slug]: (current[slug] ?? 0) + 1 }));
  }

  function countFor(site: Site): number {
    return counts[site.slug] ?? site.trending ?? 0;
  }

  const status = lastVote
    ? `Vote added for ${lastVote.name}. Here is your next match-up.`
    : "Choose a winner, or switch to a completely new pair.";

  return (
    <>
      <SiteSeo
        title="This or that"
        description="Two quiet sites side by side. Open both, vote for the better one, and get a fresh pair — every vote feeds the trending list."
        path="/this-or-that"
        keywords={["this or that", "vote on websites", "compare websites", "site battle"]}
      />

      {/* The phone's verdict bar. Hidden from the wide layout by CSS, and the
          heading it carries is the page's h1 only where it shows. */}
      <div className="tot-mobile-bar">
        <button type="button" className="tot-back" onClick={() => navigate(-1)} aria-label="Go back">
          <span aria-hidden="true">←</span>
        </button>
        <h1 className="tot-mobile-title">Which one is better?</h1>
        <button type="button" className="tot-skip" onClick={newPair}>
          Skip
        </button>
      </div>
      <p className="tot-mobile-status" aria-live="polite">
        {status}
      </p>

      <div className="tot-container mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-6">
        <header className="tot-desktop-head mx-auto flex max-w-3xl flex-col gap-3 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">
            This <span className="accent-text">or</span> that
          </h1>
          <p className="text-base" style={{ color: "var(--muted)" }}>
            Two sites, side by side and framed right here. Vote for the better one — the winner
            gets a point on the{" "}
            <Link to="/trending" className="accent-text font-bold underline underline-offset-4">
              trending list
            </Link>
            .
          </p>
        </header>

        {!enoughSites ? (
          <p className="text-center" style={{ color: "var(--muted)" }}>
            There are not enough listed sites for a match-up yet.
          </p>
        ) : (
          <>
            <div className="compare-toolbar">
              <div className="min-w-0">
                <p className="compare-toolbar-label">Pick the better site</p>
                <p className="compare-toolbar-status" aria-live="polite">
                  {status}
                </p>
              </div>
              <button type="button" className="btn ghost compare-switch" onClick={newPair}>
                <span aria-hidden="true">↻</span> Switch pair
              </button>
            </div>

            <div key={`${left.slug}-${right.slug}`} className="compare-pair">
              {[left, right].map((site) => {
                return (
                  <article key={site.slug} className="compare-side">
                    <div className="compare-head">
                      <SiteIcon site={site} size={36} label={false} />
                      <div className="min-w-0 flex flex-col">
                        <Link
                          to={`/sites/${site.slug}`}
                          className="text-[15px] font-bold truncate hover:underline underline-offset-4"
                          style={{ color: "var(--ink)" }}
                        >
                          {site.name}
                        </Link>
                        <span className="text-[11px] font-mono truncate" style={{ color: "var(--muted)" }}>
                          {siteDomain(site.url)}
                          <span className="compare-votes"> · {countFor(site)} votes</span>
                        </span>
                      </div>

                      {/* Preview controls for the phone panel: reload the frame,
                          or leave for the real site. */}
                      <div className="compare-head-actions">
                        <button
                          type="button"
                          className="compare-icon-btn"
                          aria-label={`Reload the ${site.name} preview`}
                          onClick={() => reloadFrame(site.slug)}
                        >
                          <span aria-hidden="true">↻</span>
                        </button>
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="compare-icon-btn"
                          aria-label={`Open ${siteDomain(site.url)} in a new tab`}
                        >
                          <span aria-hidden="true">↗</span>
                        </a>
                      </div>
                    </div>

                    <div className="compare-frame">
                      <iframe
                        key={`${site.slug}:${frameNonce[site.slug] ?? 0}`}
                        src={site.url}
                        title={`${site.name} preview`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="compare-foot">
                      <button
                        type="button"
                        className="btn accent"
                        onClick={() => voteFor(site)}
                      >
                        <SiteIcon site={site} size={20} label={false} />
                        Vote for {site.name}
                      </button>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="compare-open"
                      >
                        Open {siteDomain(site.url)} in a new tab <span aria-hidden="true">↗</span>
                      </a>
                      <ReportProblem
                        siteName={site.name}
                        siteUrl={site.url}
                        slug={site.slug}
                        initialType="iframe"
                        triggerLabel="Report site doesn’t allow iframe"
                        compact
                      />
                    </div>
                  </article>
                );
              })}
            </div>

            <p className="tot-footnote text-[12px] text-center" style={{ color: "var(--muted)" }}>
              Some sites refuse to be framed, so a panel can come up empty — the link under each
              one always works.
            </p>
          </>
        )}
      </div>
    </>
  );
}

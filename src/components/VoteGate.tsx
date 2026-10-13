import { useEffect, useState } from "react";
import { SiteIcon } from "./SiteIcon";
import { rankedSites, type Site } from "../lib/siteData";
import { siteDomain } from "../lib/siteTile";
import {
  castVote,
  fetchSharedCounts,
  markVoted,
  readLocalCounts,
  readVotedSlugs,
  votesConnected,
  writeLocalCount,
} from "../lib/votes";

/** Community votes a submission needs before it can be sent. */
export const VOTES_REQUIRED = 5;

/** A couple of spares, so one already-voted site never blocks the step. */
const SPARE_SLOTS = 2;

const SITE_POOL = rankedSites();
const STARTING_COUNTS = Object.fromEntries(
  SITE_POOL.map((site) => [site.slug, site.trending ?? 0]),
);

/** Sites this browser has not voted for yet, quietest first. */
function pickCandidates(): Site[] {
  const already = new Set(readVotedSlugs());
  return [...SITE_POOL]
    .filter((site) => !already.has(site.slug))
    .sort((a, b) => (a.trending ?? 0) - (b.trending ?? 0))
    .slice(0, VOTES_REQUIRED + SPARE_SLOTS);
}

/**
 * The last step of a submission: give five other listings a vote. The sites are
 * loaded for you, the counter tracks the votes in this browser, and the parent
 * decides when the step is done via `onCast`.
 */
export function VoteGate({ onCast }: { onCast?: (cast: number) => void }) {
  const [voted, setVoted] = useState<string[]>(() => readVotedSlugs());
  const [counts, setCounts] = useState<Record<string, number>>(() => ({
    ...STARTING_COUNTS,
    ...readLocalCounts(),
  }));
  const [pending, setPending] = useState<string[]>([]);
  const [shared, setShared] = useState(false);
  const [candidates] = useState<Site[]>(pickCandidates);

  useEffect(() => {
    let active = true;
    fetchSharedCounts().then((remote) => {
      if (!active || !remote) return;
      setShared(true);
      setCounts((current) => ({ ...current, ...remote }));
    });
    return () => {
      active = false;
    };
  }, []);

  const cast = voted.length;
  const ready = cast >= VOTES_REQUIRED;

  async function vote(site: Site) {
    if (voted.includes(site.slug) || pending.includes(site.slug)) return;

    const nextCount = (counts[site.slug] ?? site.trending ?? 0) + 1;
    const nextVoted = [...voted, site.slug];
    setCounts((current) => ({ ...current, [site.slug]: nextCount }));
    setVoted(nextVoted);
    setPending((current) => [...current, site.slug]);
    markVoted(site.slug);
    writeLocalCount(site.slug, nextCount);
    onCast?.(nextVoted.length);

    const sharedCount = await castVote(site.slug, "up");
    if (sharedCount !== null) {
      setShared(true);
      setCounts((current) => ({ ...current, [site.slug]: sharedCount }));
      writeLocalCount(site.slug, sharedCount);
    }
    setPending((current) => current.filter((slug) => slug !== site.slug));
  }

  return (
    <section
      className={`vote-gate${ready ? " vote-gate-ready" : ""}`}
      aria-labelledby="vote-gate-heading"
    >
      <header className="vote-gate-head">
        <div className="vote-gate-copy">
          <span className="vote-gate-kicker">Last step</span>
          <h2 id="vote-gate-heading">
            {ready ? "That’s the five votes" : `Vote for ${VOTES_REQUIRED} other sites`}
          </h2>
          <p>
            {ready
              ? "Thanks for helping a few quiet ones up the list. Send your site whenever you’re ready."
              : "Give five listings a thumbs up and your submission unlocks. It takes a few seconds."}
          </p>
        </div>

        <div className="vote-gate-meter" role="status" aria-live="polite">
          <span className="vote-gate-count">
            <strong>{Math.min(cast, VOTES_REQUIRED)}</strong> / {VOTES_REQUIRED}
          </span>
          <span className="vote-gate-bar" aria-hidden="true">
            <span
              style={{ width: `${Math.min(cast, VOTES_REQUIRED) / VOTES_REQUIRED * 100}%` }}
            />
          </span>
        </div>
      </header>

      <ul className="vote-gate-grid">
        {candidates.map((site) => {
          const hasVoted = voted.includes(site.slug);
          const isPending = pending.includes(site.slug);
          const count = counts[site.slug] ?? site.trending ?? 0;
          return (
            <li key={site.id} className={`vote-gate-card${hasVoted ? " is-voted" : ""}`}>
              <SiteIcon site={site} size={34} label={false} />
              <div className="vote-gate-card-copy">
                <strong>{site.name}</strong>
                <small>{siteDomain(site.url)}</small>
              </div>
              <button
                type="button"
                className="vote-gate-button"
                onClick={() => void vote(site)}
                disabled={hasVoted || isPending}
                aria-label={
                  hasVoted
                    ? `You voted for ${site.name}, ${count} votes`
                    : `Vote for ${site.name}, ${count} votes`
                }
              >
                <span aria-hidden="true">{hasVoted ? "✓" : "▲"}</span>
                {isPending ? "…" : count}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="vote-gate-note" role="status">
        {shared
          ? "Votes count towards the shared ranking. One vote per site."
          : votesConnected
            ? "Votes will sync with the shared ranking as soon as it responds."
            : "Votes are kept in this browser while the shared counter is offline."}
      </p>
    </section>
  );
}

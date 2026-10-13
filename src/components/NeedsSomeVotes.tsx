import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { SiteVoteRow } from "./SiteVoteRow";
import { rankedSites, type Site } from "../lib/siteData";
import {
  castVote,
  fetchSharedCounts,
  markVoted,
  readLocalCounts,
  readVotedSlugs,
  votesConnected,
  writeLocalCount,
} from "../lib/votes";

const SITE_POOL = rankedSites();
/** How many listings the strip shows at once. */
const ROW_COUNT = 3;
const STARTING_COUNTS = Object.fromEntries(
  SITE_POOL.map((site) => [site.slug, site.trending ?? 0]),
);

/** The scores as they stand on arrival: configured, then this browser's votes. */
function startingCounts(): Record<string, number> {
  return { ...STARTING_COUNTS, ...readLocalCounts() };
}

/** Weakest first — the pool a fresh slot in the strip is drawn from. */
function weakestFirst(counts: Record<string, number>): Site[] {
  return [...SITE_POOL].sort(
    (a, b) => (counts[a.slug] ?? 0) - (counts[b.slug] ?? 0) || a.name.localeCompare(b.name),
  );
}

/** The slugs of the listings that need a vote most, weakest first. */
function weakestSlugs(counts: Record<string, number>, limit: number): string[] {
  return weakestFirst(counts)
    .slice(0, limit)
    .map((site) => site.slug);
}

export function NeedsSomeVotes() {
  const [counts, setCounts] = useState<Record<string, number>>(startingCounts);
  /*
    The three listings on show. A vote lifts that listing out of the weakest, so
    the next one that needs a hand takes its place — the strip keeps giving.
  */
  const [shown, setShown] = useState<string[]>(() => weakestSlugs(startingCounts(), ROW_COUNT));
  const [voted, setVoted] = useState<string[]>(() => readVotedSlugs());
  const [pending, setPending] = useState<string[]>([]);
  const [shared, setShared] = useState(false);

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

  /** The rows in rank order, each with the position it holds in the ranking. */
  const rows = useMemo(() => {
    const strongestFirst = [...SITE_POOL].sort(
      (a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0),
    );
    return shown.flatMap((slug) => {
      const site = SITE_POOL.find((entry) => entry.slug === slug);
      if (!site) return [];
      return [{ site, rank: strongestFirst.indexOf(site) + 1 }];
    });
  }, [shown, counts]);

  async function vote(site: Site) {
    if (voted.includes(site.slug) || pending.includes(site.slug)) return;

    const nextCount = (counts[site.slug] ?? site.trending ?? 0) + 1;
    setCounts((current) => ({ ...current, [site.slug]: nextCount }));
    setVoted((current) => [...current, site.slug]);
    setPending((current) => [...current, site.slug]);
    markVoted(site.slug);
    writeLocalCount(site.slug, nextCount);

    // Hand the freed slot to the next listing that needs votes.
    const nextUp = weakestFirst(counts).find((candidate) => !shown.includes(candidate.slug));
    if (nextUp) {
      setShown((current) => current.map((slug) => (slug === site.slug ? nextUp.slug : slug)));
    }

    const sharedCount = await castVote(site.slug, "up");
    if (sharedCount !== null) {
      setShared(true);
      setCounts((current) => ({ ...current, [site.slug]: sharedCount }));
      writeLocalCount(site.slug, sharedCount);
    }
    setPending((current) => current.filter((slug) => slug !== site.slug));
  }

  if (rows.length === 0) return null;

  return (
    <section className="needs-votes-section" aria-labelledby="needs-votes-heading">
      <header className="needs-votes-heading">
        <div>
          <h2 id="needs-votes-heading">
            Needs some votes <span aria-hidden="true">🙏</span>
          </h2>
        </div>
        <Link to="/trending" className="needs-votes-all">
          Full rankings →
        </Link>
      </header>

      <div className="needs-votes-panel">
        <ol className="vote-rows">
          {rows.map(({ site, rank }) => (
            <SiteVoteRow
              key={site.id}
              site={site}
              rank={rank}
              count={counts[site.slug] ?? site.trending ?? 0}
              voted={voted.includes(site.slug)}
              pending={pending.includes(site.slug)}
              onVote={() => void vote(site)}
            />
          ))}
        </ol>
        <p className="needs-votes-note" role="status">
          {shared
            ? "Votes update the shared ranking. One vote per site, per visitor."
            : votesConnected
              ? "Showing the latest available scores; votes will sync with the shared ranking when it responds."
              : "Votes are saved in this browser only until a shared vote counter is connected."}
        </p>
      </div>
    </section>
  );
}

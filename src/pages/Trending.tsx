import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import { trendingConfig, type Site } from "../lib/siteData";
import { useDirectory } from "../lib/siteDirectory";
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

const TOP_N = trendingConfig.topLimit;

type VoteMode = "checking" | "shared" | "local" | "unreachable";

const MODE_NOTES: Record<Exclude<VoteMode, "shared">, string> = {
  checking: "Checking the vote counter…",
  local:
    "Votes are being counted in this browser only. Deploy cloudflare/votes-worker.js and set VITE_VOTES_API_URL to count everyone's votes together.",
  unreachable:
    "The vote counter could not be reached, so votes are being kept in this browser only. Check VITE_VOTES_API_URL and the deployed Worker.",
};

export default function Trending() {
  const directory = useDirectory();
  const ranked = useMemo(() => directory.trending(TOP_N), [directory]);

  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    for (const site of ranked) base[site.slug] = site.trending ?? 0;
    return { ...base, ...readLocalCounts() };
  });
  const [voted, setVoted] = useState<string[]>(() => readVotedSlugs());
  const [mode, setMode] = useState<VoteMode>(votesConnected ? "checking" : "local");
  const [pending, setPending] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    fetchSharedCounts().then((remote) => {
      if (!active) return;
      if (!remote) {
        setMode(votesConnected ? "unreachable" : "local");
        return;
      }
      setMode("shared");
      setCounts((current) => ({ ...current, ...remote }));
    });
    return () => {
      active = false;
    };
  }, []);

  async function vote(site: Site) {
    if (voted.includes(site.slug) || pending.includes(site.slug)) return;

    const optimistic = (counts[site.slug] ?? 0) + 1;
    setCounts((current) => ({ ...current, [site.slug]: optimistic }));
    setVoted((current) => [...current, site.slug]);
    setPending((current) => [...current, site.slug]);
    markVoted(site.slug);
    writeLocalCount(site.slug, optimistic);

    const serverCount = await castVote(site.slug, "up");
    if (serverCount != null) {
      setCounts((current) => ({ ...current, [site.slug]: serverCount }));
      writeLocalCount(site.slug, serverCount);
    }
    setPending((current) => current.filter((slug) => slug !== site.slug));
  }

  return (
    <>
      <SiteSeo
        title={trendingConfig.title}
        description={`${trendingConfig.tagline} The top ${TOP_N} launched sites, ranked by stored votes and a small editorial boost.`}
        path="/trending"
        keywords={["trending sites", "site ranking", "vote for sites"]}
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        <header className="flex flex-col gap-3 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">
            {trendingConfig.title} <span aria-hidden="true">🔥</span>
          </h1>
          <p className="text-base" style={{ color: "var(--muted)" }}>
            {trendingConfig.tagline} The top {ranked.length} launched sites, stacked in order — one
            vote each.
          </p>
        </header>

        {mode !== "shared" && (
          <p
            className="border px-4 py-3 text-[13px] leading-relaxed"
            style={{
              borderColor: "var(--rule)",
              backgroundColor: "var(--surface)",
              color: "var(--muted)",
            }}
          >
            {MODE_NOTES[mode]}
          </p>
        )}

        <ol className="stack">
          {ranked.map((site, index) => {
            const hasVoted = voted.includes(site.slug);
            const count = counts[site.slug] ?? site.trending ?? 0;
            return (
              <li key={site.id} className="stack-row">
                <span
                  className={`rank${index < 3 ? ` rank-top rank-${index + 1}` : ""}`}
                >
                  {index + 1}
                </span>

                <SiteIcon site={site} size={44} label={false} />

                <div className="min-w-0 flex flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <Link
                      to={`/sites/${site.slug}`}
                      className="font-bold truncate hover:underline underline-offset-4"
                      style={{ color: "var(--ink)" }}
                    >
                      {site.name}
                    </Link>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rank-visit"
                      title={`Open ${siteDomain(site.url)}`}
                    >
                      ↗
                    </a>
                  </span>
                  <p className="text-[13px] truncate" style={{ color: "var(--muted)" }}>
                    {site.description}
                  </p>
                  <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
                    {siteDomain(site.url)}
                  </span>
                </div>

                <button
                  type="button"
                  className="vote-btn"
                  onClick={() => void vote(site)}
                  disabled={hasVoted}
                  aria-label={
                    hasVoted
                      ? `${site.name} voted, ${count} votes`
                      : `Vote for ${site.name}, ${count} votes`
                  }
                  title={hasVoted ? "You already voted for this site" : "Vote for this site"}
                >
                  <span aria-hidden="true">{hasVoted ? "✓" : "▲"}</span>
                  {count}
                </button>
              </li>
            );
          })}
        </ol>

        <p className="text-sm text-center" style={{ color: "var(--muted)" }}>
          Looking for the whole directory?{" "}
          <a href="/#explore" className="accent-text font-bold underline underline-offset-4">
            Browse all sites
          </a>
        </p>
      </div>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteVoteRow } from "../components/SiteVoteRow";
import { rankedSites, siteName, siteUrl, trendingConfig, type Site } from "../lib/siteData";
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
  // Every listed site can climb, not just the ones that start in the top slots.
  const pool = useMemo(() => rankedSites(), []);

  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    for (const site of pool) base[site.slug] = site.trending ?? 0;
    return { ...base, ...readLocalCounts() };
  });
  const [voted, setVoted] = useState<string[]>(() => readVotedSlugs());
  const [mode, setMode] = useState<VoteMode>(votesConnected ? "checking" : "local");
  const [pending, setPending] = useState<string[]>([]);

  /*
    The ranking is the votes: a site that collects more of them moves straight to
    the top, and the ones it passes slide down. Sites on equal votes keep the
    configured order, so the list is stable until somebody votes.
  */
  const ranked = useMemo(() => {
    const configured = new Map(pool.map((site, index) => [site.slug, index]));
    return [...pool]
      .sort((a, b) => {
        const votes = (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0);
        if (votes !== 0) return votes;
        return (configured.get(a.slug) ?? 0) - (configured.get(b.slug) ?? 0);
      })
      .slice(0, TOP_N);
  }, [pool, counts]);

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
        keywords={[
          "discover websites",
          "find websites",
          "new and upcoming websites",
          "website ranking",
          "bored button alternatives",
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${siteName} trending websites`,
            url: `${siteUrl}/trending`,
            numberOfItems: ranked.length,
            itemListElement: ranked.map((site, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "WebSite",
                name: site.name,
                url: site.url,
                description: site.description,
              },
            })),
          },
        ]}
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
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Looking to discover websites fast? Start here, then jump to{" "}
            <Link to="/discover-websites" className="accent-text font-bold underline underline-offset-4">
              curated discovery paths
            </Link>{" "}
            or{" "}
            <Link to="/new-websites" className="accent-text font-bold underline underline-offset-4">
              newly launched websites
            </Link>
            .
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

        <ol className="vote-rows">
          {ranked.map((site, index) => (
            <SiteVoteRow
              key={site.id}
              site={site}
              rank={index + 1}
              medal
              leader={index === 0}
              count={counts[site.slug] ?? site.trending ?? 0}
              voted={voted.includes(site.slug)}
              pending={pending.includes(site.slug)}
              onVote={() => void vote(site)}
            />
          ))}
        </ol>

        <p className="text-sm text-center" style={{ color: "var(--muted)" }}>
          Looking for the whole directory?{" "}
          <a href="/#explore" className="accent-text font-bold underline underline-offset-4">
            Browse all sites
          </a>
          {" · "}
          <Link to="/collections" className="accent-text font-bold underline underline-offset-4">
            Open curated collections
          </Link>
        </p>
      </div>
    </>
  );
}

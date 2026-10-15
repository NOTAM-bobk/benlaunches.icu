import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteVoteRow } from "../components/SiteVoteRow";
import { rankedSites, siteName, siteUrl, trendingConfig, type Site } from "../lib/siteData";
import {
  castVote,
  fetchSharedCounts,
  fetchMonthlyCounts,
  fetchMonthlyMonths,
  markVoted,
  readLocalMonthlyCounts,
  readLocalMonthlyMonths,
  readLocalCounts,
  readVotedSlugs,
  votesConnected,
  writeLocalCount,
} from "../lib/votes";

const TOP_N = trendingConfig.topLimit;
const CURRENT_UTC_MONTH = new Date().toISOString().slice(0, 7);

function monthLabel(month: string, style: "short" | "long" = "long") {
  return new Intl.DateTimeFormat("en-US", {
    month: style,
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));
}

type VoteMode = "checking" | "shared" | "local" | "unreachable";

/**
 * Which set of counts the list is showing. "lifetime" is the fallback: the
 * lifetime totals from `/counts`, used whenever the monthly counter is not
 * answering, so a Worker that predates the monthly routes still shows real
 * vote numbers instead of zeros.
 */
type CountScope = "lifetime" | "monthly";

const MODE_NOTES: Record<Exclude<VoteMode, "shared">, string> = {
  checking: "Checking the vote counter…",
  local:
    "Votes are being counted in this browser only. Deploy cloudflare/votes-worker.js and set VITE_VOTES_API_URL to count everyone's votes together.",
  unreachable:
    "The vote counter could not be reached, so votes are being kept in this browser only. Check VITE_VOTES_API_URL and the deployed Worker.",
};

export default function Trending() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentMonth = CURRENT_UTC_MONTH;
  const monthParam = searchParams.get("month");
  const selectedMonth = monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)
    ? monthParam
    : currentMonth;
  /* An archived month is only meaningful with the shared monthly counter: this
     browser cannot hold anyone else's past votes. */
  const [scope, setScope] = useState<CountScope>("monthly");
  const monthlyView = scope === "monthly";
  const isCurrentMonth = selectedMonth === currentMonth;
  const canVote = monthlyView && isCurrentMonth;
  const [archiveMonths, setArchiveMonths] = useState([currentMonth]);
  const [monthlyCounts, setMonthlyCounts] = useState<Record<string, number>>(
    () => readLocalMonthlyCounts(currentMonth),
  );

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
    const ranking = monthlyView ? monthlyCounts : counts;
    return [...pool]
      .sort((a, b) => {
        const votes = (ranking[b.slug] ?? 0) - (ranking[a.slug] ?? 0);
        if (votes !== 0) return votes;
        return (configured.get(a.slug) ?? 0) - (configured.get(b.slug) ?? 0);
      })
      .slice(0, TOP_N);
  }, [pool, monthlyView, monthlyCounts, counts]);

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

  useEffect(() => {
    let active = true;
    fetchMonthlyMonths().then((sharedMonths) => {
      if (!active) return;
      const months = sharedMonths ?? readLocalMonthlyMonths();
      setArchiveMonths([...new Set([currentMonth, ...months])].sort((a, b) => b.localeCompare(a)));
    });
    return () => {
      active = false;
    };
  }, [currentMonth]);

  useEffect(() => {
    let active = true;
    fetchMonthlyCounts(selectedMonth).then((sharedCounts) => {
      if (!active) return;
      if (sharedCounts !== null) {
        setScope("monthly");
        setMonthlyCounts(sharedCounts);
      } else {
        setMonthlyCounts(readLocalMonthlyCounts(selectedMonth));
        setScope("lifetime");
      }
    });
    return () => {
      active = false;
    };
  }, [selectedMonth]);

  async function vote(site: Site) {
    if (!canVote) return;
    if (voted.includes(site.slug) || pending.includes(site.slug)) return;

    const optimistic = (counts[site.slug] ?? 0) + 1;
    setCounts((current) => ({ ...current, [site.slug]: optimistic }));
    setMonthlyCounts((current) => ({
      ...current,
      [site.slug]: (current[site.slug] ?? 0) + 1,
    }));
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

  function chooseMonth(month: string) {
    setMonthlyCounts(readLocalMonthlyCounts(month));
    const next = new URLSearchParams(searchParams);
    if (month === currentMonth) next.delete("month");
    else next.set("month", month);
    setSearchParams(next);
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
            {trendingConfig.tagline}{" "}
            {monthlyView
              ? `Rankings use community upvotes cast during ${monthLabel(selectedMonth)}.`
              : "Rankings use every community upvote a site has collected."}
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

        {monthlyView ? (
          <section className="trending-month-archive" aria-label="Monthly trending archive">
            <div className="trending-month-heading">
              <span>Monthly rankings</span>
              <span className="trending-month-current">Showing {monthLabel(selectedMonth)}</span>
            </div>
            <div className="trending-month-cards" role="group" aria-label="Choose a month">
              {archiveMonths.map((month) => (
                <button
                  key={month}
                  type="button"
                  className={`trending-month-card${selectedMonth === month ? " is-active" : ""}`}
                  aria-pressed={selectedMonth === month}
                  onClick={() => chooseMonth(month)}
                >
                  <span className="trending-month-name">{monthLabel(month, "short").split(" ")[0]}</span>
                  <span className="trending-month-year">{month.slice(0, 4)}</span>
                  <span className="trending-month-kind">{month === currentMonth ? "Current" : "Archive"}</span>
                </button>
              ))}
            </div>
            {archiveMonths.length === 1 && (
              <p className="trending-month-note">
                Earlier months will appear here as they close. Existing lifetime votes cannot be split into past months.
              </p>
            )}
          </section>
        ) : (
          <p className="trending-month-note">
            {mode === "shared"
              ? "Month-by-month rankings start once the updated vote counter is deployed. Until then this list ranks every site by its total votes, which is the same number each site shows on its own page."
              : "Month-by-month rankings start once the shared vote counter is reachable. Until then this list ranks every site by the votes this browser can see."}
          </p>
        )}

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
              count={monthlyView ? monthlyCounts[site.slug] ?? 0 : counts[site.slug] ?? 0}
              voted={canVote && voted.includes(site.slug)}
              pending={pending.includes(site.slug)}
              readOnly={!canVote}
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

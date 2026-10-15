import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { FeaturedLaunchSlots } from "../components/FeaturedLaunchSlots";
import { SiteSeo } from "../components/SeoHead";
import { ShareLaunchCard } from "../components/ShareLaunchCard";
import { SiteIcon } from "../components/SiteIcon";
import {
  categoryFilters,
  categoryLabel,
  newAdditions,
  siteName,
  siteUrl,
  sites,
  updatedAt,
  type Site,
} from "../lib/siteData";
import { formatDate } from "../lib/posts";
import { siteDomain } from "../lib/siteTile";
import { fetchSharedCounts } from "../lib/votes";

/** The window each date filter covers, in days. `all` is the whole list. */
type RangeId = "week" | "month" | "quarter" | "half" | "all";

const RANGES: ReadonlyArray<{ id: RangeId; label: string; note: string; days: number | null }> = [
  { id: "week", label: "This week", note: "the last seven days", days: 7 },
  { id: "month", label: "This month", note: "the last thirty days", days: 30 },
  { id: "quarter", label: "Last 3 months", note: "the last ninety days", days: 90 },
  { id: "half", label: "Last 6 months", note: "the last six months", days: 180 },
  { id: "all", label: "All time", note: "the whole directory", days: null },
];

/** How the feed orders a window of listings. */
type SortId = "newest" | "updated" | "discussed";

const SORTS: ReadonlyArray<{ id: SortId; label: string; note: string }> = [
  { id: "newest", label: "Newest", note: "latest launch dates first" },
  { id: "updated", label: "Recently updated", note: "the freshest listings first" },
  { id: "discussed", label: "Most discussed", note: "the busiest ones first" },
];

/** Free versus paid, read from the pricing line a submission left behind. */
type PriceId = "all" | "free" | "paid";

const PRICES: ReadonlyArray<{ id: PriceId; label: string }> = [
  { id: "all", label: "Any price" },
  { id: "free", label: "Free" },
  { id: "paid", label: "Paid" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
/** Launches newer than this wear the "just launched" label. */
const JUST_LAUNCHED_DAYS = 7;

/** Whole days between a listing's launch date and today, or null if undated. */
function ageInDays(launched: string | undefined, now: number): number | null {
  if (!launched) return null;
  const time = Date.parse(launched);
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((now - time) / DAY_MS));
}

/** "today", "12 days ago", "3 months ago" — a quicker read than a date. */
function sinceLabel(launched: string | undefined, now: number): string {
  const days = ageInDays(launched, now);
  if (days === null) return "Date not listed";
  if (days === 0) return "Launched today";
  if (days === 1) return "Launched yesterday";
  if (days < 14) return `Launched ${days} days ago`;
  if (days < 60) return `Launched ${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `Launched ${Math.round(days / 30)} months ago`;
  const years = Math.round(days / 365);
  return `Launched ${years} ${years === 1 ? "year" : "years"} ago`;
}

/** Free, paid, or nothing to go on. Freemium reads as "free to start". */
function priceKind(site: Site): PriceId | "unknown" {
  const pricing = (site.extras?.pricing ?? "").toLowerCase();
  if (!pricing) return "unknown";
  const free = /\bfree\b|open[- ]source|no cost|free tier|free plan/.test(pricing);
  const paid = /\bpaid\b|premium|subscription|subscri|\/mo\b|per month|monthly|one[- ]time|[$€£]\s?\d/.test(
    pricing,
  );
  if (free) return "free";
  if (paid) return "paid";
  return "unknown";
}

/** A short badge for the two price kinds, or null when pricing is unlisted. */
function priceLabel(site: Site): string | null {
  const kind = priceKind(site);
  if (kind === "free") return "Free";
  if (kind === "paid") return "Paid";
  return null;
}

/** Votes + editorial buzz, which together stand in for how busy a site is. */
function discussionScore(site: Site, counts: Record<string, number>): number {
  return (counts[site.slug] ?? 0) + (site.trending ?? 0);
}

function sortSites(list: Site[], sort: SortId, counts: Record<string, number>): Site[] {
  const copy = [...list];
  if (sort === "updated") {
    copy.sort(
      (a, b) => updatedAt(b).localeCompare(updatedAt(a)) || (b.launched ?? "").localeCompare(a.launched ?? ""),
    );
    return copy;
  }
  if (sort === "discussed") {
    copy.sort(
      (a, b) =>
        discussionScore(b, counts) - discussionScore(a, counts) ||
        (b.launched ?? "").localeCompare(a.launched ?? ""),
    );
    return copy;
  }
  copy.sort((a, b) => (b.launched ?? "").localeCompare(a.launched ?? ""));
  return copy;
}

export default function NewWebsites() {
  const [params, setParams] = useSearchParams();

  const asked = params.get("since");
  const range = RANGES.find((entry) => entry.id === asked) ?? RANGES[RANGES.length - 1]!;
  const askedSort = params.get("sort");
  const sort = SORTS.find((entry) => entry.id === askedSort) ?? SORTS[0]!;
  const category = params.get("category") ?? "";
  const tag = params.get("tag") ?? "";
  const askedPrice = params.get("price") as PriceId | null;
  const price: PriceId = PRICES.some((entry) => entry.id === askedPrice) ? (askedPrice as PriceId) : "all";

  // Read the clock once when the page mounts, so the filters and the cards agree.
  const [now] = useState(() => Date.now());
  /** Shared vote counts feed "most discussed"; absent means it falls back to buzz. */
  const [votes, setVotes] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    void fetchSharedCounts().then((counts) => {
      if (active && counts) setVotes(counts);
    });
    return () => {
      active = false;
    };
  }, []);

  /** Every listed site, newest first. Sites without a date sort last. */
  const all = useMemo(() => newAdditions(sites.length), []);

  const counts = useMemo(() => {
    const tally = {} as Record<RangeId, number>;
    for (const entry of RANGES) {
      const window = entry.days;
      tally[entry.id] =
        window === null
          ? all.length
          : all.filter((site) => {
              const age = ageInDays(site.launched, now);
              return age !== null && age <= window;
            }).length;
    }
    return tally;
  }, [all, now]);

  /** Tags offered in the filter, most used first. */
  const tagOptions = useMemo(() => {
    const tally = new Map<string, number>();
    for (const site of sites) {
      for (const entry of site.tags) tally.set(entry, (tally.get(entry) ?? 0) + 1);
    }
    return [...tally.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 40)
      .map(([value]) => value);
  }, []);

  const listed = useMemo(() => {
    const window = range.days;
    const filtered = all.filter((site) => {
      const age = ageInDays(site.launched, now);
      if (window !== null && (age === null || age > window)) return false;
      if (category && site.category !== category) return false;
      if (tag && !site.tags.includes(tag)) return false;
      if (price !== "all" && priceKind(site) !== price) return false;
      return true;
    });
    return sortSites(filtered, sort.id, votes);
  }, [all, range, category, tag, price, sort, votes, now]);

  /** The spotlight: a fresh launch, chosen the same way for everyone that day. */
  const launchOfDay = useMemo(() => {
    const fresh = all.filter((site) => {
      const age = ageInDays(site.launched, now);
      return age !== null && age <= JUST_LAUNCHED_DAYS;
    });
    if (fresh.length === 0) return null;
    const day = Math.floor(now / DAY_MS);
    return fresh[day % fresh.length]!;
  }, [all, now]);

  const filtered = Boolean(category || tag || price !== "all" || range.id !== "all" || sort.id !== "newest");

  function pick(key: string, value: string) {
    const next = new URLSearchParams(params);
    const fallback = key === "since" ? "all" : key === "sort" ? "newest" : key === "price" ? "all" : "";
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true, preventScrollReset: true });
  }

  function clearFilters() {
    setParams(new URLSearchParams(), { replace: true, preventScrollReset: true });
  }

  /** The SEO list stays the newest slice of the directory, whatever is filtered. */
  const latest = useMemo(() => all.slice(0, 24), [all]);

  return (
    <>
      <SiteSeo
        title="New and upcoming websites"
        description={`Find new and upcoming websites from ${siteName}, including fresh launches and recently added discoveries.`}
        path="/new-websites"
        keywords={[
          "new and upcoming websites",
          "launch new websites",
          "find websites",
          "discover websites",
          "new website launches",
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `New and upcoming websites on ${siteName}`,
            url: `${siteUrl}/new-websites`,
            description: "Recently launched and newly discovered websites.",
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "New and upcoming websites list",
            url: `${siteUrl}/new-websites`,
            numberOfItems: latest.length,
            itemListElement: latest.map((site, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: { "@type": "WebSite", name: site.name, url: site.url, description: site.description },
            })),
          },
        ]}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        <header className="flex flex-col gap-3 border-b pb-6" style={{ borderColor: "var(--rule)" }}>
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
            Live launch feed
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">
            Find what just <span className="accent-text">launched</span>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            A running feed of new and recently updated websites. Sort it, narrow it to a category or a
            tag, and see what is worth a look before it gets crowded.
          </p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Prefer browsing by intent? Visit{" "}
            <Link to="/discover-websites" className="accent-text font-bold underline underline-offset-4">
              discover websites
            </Link>{" "}
            or open{" "}
            <Link to="/collections" className="accent-text font-bold underline underline-offset-4">
              curated collections
            </Link>
            .
          </p>
        </header>

        <FeaturedLaunchSlots />

        {launchOfDay && (
          <section className="launch-spotlight" aria-labelledby="launch-of-day-heading">
            <div className="launch-spotlight-copy">
              <span className="launch-spotlight-badge">🌟 Launch of the day</span>
              <div className="launch-spotlight-title">
                <SiteIcon site={launchOfDay} size={42} label={false} />
                <h2 id="launch-of-day-heading">{launchOfDay.name}</h2>
              </div>
              <p>{launchOfDay.description}</p>
              <p className="launch-spotlight-meta">
                {sinceLabel(launchOfDay.launched, now)}
                {launchOfDay.launched ? ` · ${formatDate(launchOfDay.launched)}` : ""} ·{" "}
                {categoryLabel(launchOfDay.category)}
              </p>
              <div className="launch-spotlight-actions">
                <a
                  className="btn accent"
                  href={launchOfDay.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit {siteDomain(launchOfDay.url)} <span aria-hidden="true">→</span>
                </a>
                <Link className="btn ghost" to={`/sites/${launchOfDay.slug}`}>
                  Listing details
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="new-filter" aria-labelledby="new-filter-heading">
          <div className="new-filter-head">
            <h2 id="new-filter-heading" className="text-lg font-bold">
              Shape the feed
            </h2>
            <p className="text-[12px] font-mono uppercase tracking-[0.1em]" style={{ color: "var(--muted)" }}>
              {listed.length} of {all.length} sites
            </p>
          </div>

          <div className="feed-sort" role="group" aria-label="Sort the feed">
            {SORTS.map((entry) => {
              const active = entry.id === sort.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`feed-sort-option${active ? " active" : ""}`}
                  onClick={() => pick("sort", entry.id)}
                  aria-pressed={active}
                >
                  <strong>{entry.label}</strong>
                  <small>{entry.note}</small>
                </button>
              );
            })}
          </div>

          <div className="chip-row" role="group" aria-label="Filter listings by launch date">
            {RANGES.map((entry) => {
              const active = entry.id === range.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className="chip"
                  onClick={() => pick("since", entry.id)}
                  aria-pressed={active}
                  style={{
                    backgroundColor: active ? "var(--accent)" : "#ffffff",
                    color: active ? "var(--on-accent)" : "var(--ink)",
                  }}
                >
                  {entry.label}
                  <span className="new-filter-count" aria-hidden="true">
                    {counts[entry.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="feed-selects">
            <label className="feed-select">
              <span>Category</span>
              <select value={category} onChange={(event) => pick("category", event.target.value)}>
                <option value="">Every category</option>
                {categoryFilters
                  .filter((entry) => entry.id !== "all")
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
              </select>
            </label>

            <label className="feed-select">
              <span>Tag</span>
              <select value={tag} onChange={(event) => pick("tag", event.target.value)}>
                <option value="">Any tag</option>
                {tagOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>

            <label className="feed-select">
              <span>Price</span>
              <select value={price} onChange={(event) => pick("price", event.target.value)}>
                {PRICES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="feed-status">
            <p className="text-[12px]" style={{ color: "var(--muted)" }}>
              {listed.length === 0
                ? "Nothing matches these filters yet."
                : `${listed.length === 1 ? "One site" : `${listed.length} sites`} · ${range.note} · sorted by ${sort.label.toLowerCase()}.`}
            </p>
            {filtered && (
              <button type="button" className="new-filter-link" onClick={clearFilters}>
                Reset the feed
              </button>
            )}
          </div>
        </section>

        {listed.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listed.map((site) => {
              const age = ageInDays(site.launched, now);
              const justLaunched = age !== null && age <= JUST_LAUNCHED_DAYS;
              const priceTag = priceLabel(site);
              const updated = site.updated && site.updated !== site.launched;
              return (
                <li key={site.id} className="card launch-card">
                  <div className="launch-card-head">
                    <SiteIcon site={site} size={30} />
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold hover:underline underline-offset-4"
                      style={{ color: "var(--ink)" }}
                    >
                      {site.name}
                    </a>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    {site.description}
                  </p>
                  <div className="launch-card-badges">
                    {site.featured && <span className="launch-badge launch-badge-featured">Featured</span>}
                    {justLaunched && <span className="launch-badge launch-badge-fresh">Just launched</span>}
                    {updated && <span className="launch-badge">Updated</span>}
                    {priceTag && <span className="launch-badge">{priceTag}</span>}
                    <span className="launch-badge launch-badge-category">{categoryLabel(site.category)}</span>
                  </div>
                  <span className="launch-card-meta">
                    {site.launched ? sinceLabel(site.launched, now) : "Recently added"}
                    {site.launched ? ` · ${formatDate(site.launched)}` : " · no date"} ·{" "}
                    {siteDomain(site.url)}
                  </span>
                  <div className="launch-card-foot">
                    <Link to={`/sites/${site.slug}`} className="launch-card-link">
                      Open the listing <span aria-hidden="true">↗</span>
                    </Link>
                    <ShareLaunchCard site={site} className="mycol-mini-btn" />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="new-filter-empty">
            <p>
              <strong>Nothing matches this feed yet.</strong> Try a wider range, or{" "}
              <button type="button" className="new-filter-link" onClick={clearFilters}>
                reset every filter
              </button>
              .
            </p>
          </div>
        )}
      </div>
    </>
  );
}

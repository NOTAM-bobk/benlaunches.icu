import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import { newAdditions, siteName, siteUrl, sites } from "../lib/siteData";
import { formatDate } from "../lib/posts";
import { siteDomain } from "../lib/siteTile";

/** The window each date filter covers, in days. `all` is the whole list. */
type RangeId = "week" | "month" | "quarter" | "half" | "all";

const RANGES: ReadonlyArray<{ id: RangeId; label: string; note: string; days: number | null }> = [
  { id: "week", label: "This week", note: "the last seven days", days: 7 },
  { id: "month", label: "This month", note: "the last thirty days", days: 30 },
  { id: "quarter", label: "Last 3 months", note: "the last ninety days", days: 90 },
  { id: "half", label: "Last 6 months", note: "the last six months", days: 180 },
  { id: "all", label: "All time", note: "the whole directory", days: null },
];

const DAY_MS = 24 * 60 * 60 * 1000;

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

export default function NewWebsites() {
  const [params, setParams] = useSearchParams();
  const asked = params.get("since");
  const range = RANGES.find((entry) => entry.id === asked) ?? RANGES[RANGES.length - 1]!;

  // Read the clock once when the page mounts, so the filters and the cards agree.
  const [now] = useState(() => Date.now());

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

  const listed = useMemo(() => {
    const window = range.days;
    if (window === null) return all;
    return all.filter((site) => {
      const age = ageInDays(site.launched, now);
      return age !== null && age <= window;
    });
  }, [all, range, now]);

  /** The SEO list stays the newest slice of the directory, whatever is filtered. */
  const latest = useMemo(() => all.slice(0, 24), [all]);

  function pick(id: RangeId) {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("since");
    else next.set("since", id);
    setParams(next, { replace: true, preventScrollReset: true });
  }

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
            New and upcoming websites
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">
            Find what just <span className="accent-text">launched</span>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            Track recent launches, see what is newly added, and discover websites before they become
            crowded.
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

        <section className="new-filter" aria-labelledby="new-filter-heading">
          <div className="new-filter-head">
            <h2 id="new-filter-heading" className="text-lg font-bold">
              Filter by launch date
            </h2>
            <p className="text-[12px] font-mono uppercase tracking-[0.1em]" style={{ color: "var(--muted)" }}>
              {listed.length} of {all.length} sites
            </p>
          </div>
          <div className="chip-row" role="group" aria-label="Filter listings by launch date">
            {RANGES.map((entry) => {
              const active = entry.id === range.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className="chip"
                  onClick={() => pick(entry.id)}
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
          <p className="text-[12px]" style={{ color: "var(--muted)" }}>
            {listed.length === 0
              ? `Nothing launched in ${range.note}.`
              : `${listed.length === 1 ? "One site" : `${listed.length} sites`} from ${range.note}, newest first.`}
          </p>
        </section>

        {listed.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listed.map((site) => (
              <li key={site.id} className="card p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
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
                <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
                  {site.launched ? sinceLabel(site.launched, now) : "Recently added"} ·{" "}
                  {site.launched ? formatDate(site.launched) : "no date"} · {siteDomain(site.url)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="new-filter-empty">
            <p>
              <strong>Nothing launched in this window yet.</strong> Try a wider range, or{" "}
              <button type="button" className="new-filter-link" onClick={() => pick("all")}>
                show every site
              </button>
              .
            </p>
          </div>
        )}

        {listed.length > 0 && range.id !== "all" && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Looking for the ones that dropped off this window?{" "}
            <button type="button" className="new-filter-link" onClick={() => pick("all")}>
              Show all {all.length} sites
            </button>
            .
          </p>
        )}
      </div>
    </>
  );
}

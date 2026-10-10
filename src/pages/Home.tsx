import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AvatarRow } from "../components/AvatarRow";
import { Highlight } from "../components/Highlight";
import { LaunchesThisWeek } from "../components/LaunchesThisWeek";
import { NeedsSomeVotes } from "../components/NeedsSomeVotes";
import { HomepageSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import { VerifiedStamp } from "../components/VerifiedStamp";
import {
  categoryById,
  categoryFilters,
  categoryLabel,
  collectionSites,
  collections,
  editorsPicks,
  exploreConfig,
  featuredSiteRows,
  interestingSites,
  newAdditions,
  searchSites,
  siteName,
  siteTagline,
  sites,
  sitesByCategory,
  trendingSites,
  type Site,
  type SiteCollection,
} from "../lib/siteData";
import { formatDate, posts } from "../lib/posts";
import { siteDomain } from "../lib/siteTile";

/** What a cool site should do, one line at a time in the home hero. */
const FIND_PHRASES = [
  "Find interesting sites",
  "Shows recent launches",
  "Helps your site get discovered",
  "Find cool sites",
  "Get a featured-on badge",
  "Get real traffic",
  "Find useful tools",
];

/**
 * "A cool site that…" with one phrase at a time underneath. Each phrase leaves
 * with a blur and a tilt and the next one settles in the same way. The moving
 * text is decorative — a single sentence with the same meaning is offered to
 * screen readers from the page itself.
 */
function FindRotator() {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const hold = window.setTimeout(() => setLeaving(true), 2700);
    const swap = window.setTimeout(() => {
      setIndex((value) => (value + 1) % FIND_PHRASES.length);
      setLeaving(false);
    }, 3050);
    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(swap);
    };
  }, [index]);

  return (
    <p className="find-rotate" aria-hidden="true">
      <span className="find-rotate-lead">
        <span className="find-pulse" />
        A cool site that…
      </span>
      <span key={index} className={`find-rotate-phrase${leaving ? " leaving" : ""}`}>
        {FIND_PHRASES[index]}
      </span>
    </p>
  );
}

/** Only the newest handful of posts get a card in the home page's article row. */
const FEATURED_POSTS = posts.slice(0, 3);

/** How many directory cards a phone loads before it offers the rest. */
const SITE_PAGE = 9;

/* ---------------- pieces ---------------- */

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12v18l-6-5-6 5z" />
    </svg>
  );
}

function SiteRow({ site }: { site: Site }) {
  return (
    <li className="site-row">
      <SiteIcon site={site} size={36} />
      <div className="min-w-0">
        <Link
          to={`/sites/${site.slug}`}
          className="text-[15px] font-bold truncate block hover:underline underline-offset-4"
          style={{ color: "var(--ink)" }}
        >
          {site.name}
        </Link>
        <p className="text-[13px] truncate" style={{ color: "var(--muted)" }}>
          {site.description}
        </p>
      </div>
      <a
        href={site.url}
        target="_blank"
        rel="noopener noreferrer"
        className="site-row-visit"
        title={`Open ${site.name} in a new tab`}
        aria-label={`Open ${site.name} in a new tab`}
      >
        ↗
      </a>
    </li>
  );
}

function SectionHead({
  title,
  note,
  page,
  pageCount,
  onPrev,
  onNext,
}: {
  title: string;
  note?: string;
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="sec-head flex items-end justify-between gap-4 border-b pb-3"
      style={{ borderColor: "var(--rule)" }}
    >
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-bold tracking-[-0.01em]">{title}</h2>
        {note && (
          <span
            className="hidden sm:inline text-[11px] font-mono"
            style={{ color: "var(--muted)" }}
          >
            {note}
          </span>
        )}
      </div>
      {pageCount > 1 && (
        <div className="sec-pager flex items-center gap-2">
          <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
            {page + 1}/{pageCount}
          </span>
          <button
            type="button"
            className="pager"
            onClick={onPrev}
            disabled={page === 0}
            aria-label={`Previous ${title}`}
          >
            ‹
          </button>
          <button
            type="button"
            className="pager"
            onClick={onNext}
            disabled={page >= pageCount - 1}
            aria-label={`More ${title}`}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

/** How many rows one phone screenful holds before you swipe on. */
const MOBILE_PAGE = 5;

function chunk<T>(list: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < list.length; i += size) groups.push(list.slice(i, i + size));
  return groups;
}

function PagedRows({ items, title, note }: { items: Site[]; title: string; note?: string }) {
  const [page, setPage] = useState(0);
  const [mobilePage, setMobilePage] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const perPage = exploreConfig.rowsPerPage;
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const current = items.slice(page * perPage, page * perPage + perPage);

  /*
    Phones get five rows at a time and swipe sideways for the next five, so the
    whole list is reachable without a "show all" button. Desktops keep the grid
    and its pager.
  */
  const mobilePages = useMemo(() => chunk(items, MOBILE_PAGE), [items]);

  /*
    Keep the dots in step with whatever the swipe settled on. The pages are
    compared by their on-screen centres rather than offsetLeft, which is measured
    from the offset parent and so would not line up with rail.scrollLeft.
  */
  function trackSwipe() {
    const rail = railRef.current;
    if (!rail) return;
    const railRect = rail.getBoundingClientRect();
    const middle = railRect.left + railRect.width / 2;
    let nearest = 0;
    let distance = Infinity;
    [...rail.children].forEach((child, index) => {
      const box = (child as HTMLElement).getBoundingClientRect();
      const gap = Math.abs(box.left + box.width / 2 - middle);
      if (gap < distance) {
        distance = gap;
        nearest = index;
      }
    });
    setMobilePage(nearest);
  }

  function showMobilePage(index: number) {
    const target = railRef.current?.children[index] as HTMLElement | undefined;
    target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    setMobilePage(index);
  }

  return (
    <section className="space-y-4">
      <SectionHead
        title={title}
        note={note}
        page={page}
        pageCount={pageCount}
        onPrev={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
      />
      <ul className="home-desktop-grid grid grid-cols-1 gap-x-10 gap-y-1 sm:grid-cols-2">
        {current.map((site) => (
          <SiteRow key={site.id} site={site} />
        ))}
      </ul>

      <div className="home-mobile-swipe-wrap">
        <div
          className="home-mobile-swipe"
          ref={railRef}
          onScroll={trackSwipe}
          aria-label={`${title} pages`}
        >
          {mobilePages.map((group, index) => (
            <ul className="home-mobile-page" key={`${title}-page-${index + 1}`}>
              {/* SiteRow is already an <li>, so it goes straight into the page. */}
              {group.map((site) => (
                <SiteRow key={site.id} site={site} />
              ))}
            </ul>
          ))}
        </div>

        {mobilePages.length > 1 && (
          <div className="carousel-dots home-mobile-dots" aria-label={`Choose a page of ${title}`}>
            {mobilePages.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`carousel-dot${index === mobilePage ? " carousel-dot-active" : ""}`}
                aria-label={`Show ${title} page ${index + 1} of ${mobilePages.length}`}
                aria-current={index === mobilePage ? "true" : undefined}
                onClick={() => showMobilePage(index)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CollectionCard({
  collection,
  saved,
  onToggle,
}: {
  collection: SiteCollection;
  saved: boolean;
  onToggle: () => void;
}) {
  const members = collectionSites(collection);

  return (
    <article className="collection-card">
      <div className="flex items-start justify-between gap-3">
        <div className="tile-cluster">
          {members.slice(0, 5).map((site) => (
            <SiteIcon key={site.id} site={site} size={30} label={false} />
          ))}
          {members.length > 5 && (
            <span className="site-tile" style={{ width: 30, height: 30, fontSize: 11 }} aria-hidden="true">
              +{members.length - 5}
            </span>
          )}
        </div>
        <button
          type="button"
          className="save-btn"
          onClick={onToggle}
          aria-pressed={saved}
          title={saved ? "Remove from saved" : "Save this collection"}
        >
          <BookmarkIcon filled={saved} />
        </button>
      </div>

      <h3 className="text-lg font-bold leading-snug">
        <Link
          to={`/collections/${collection.id}`}
          className="hover:underline underline-offset-4"
        >
          {collection.title}
        </Link>
      </h3>
      <p className="mt-1 text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>
        {collection.description}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
          {members.length} sites
        </span>
        <Link
          to={`/collections/${collection.id}`}
          className="text-[11px] font-bold uppercase tracking-[0.14em] accent-text"
        >
          Open collection →
        </Link>
      </div>
    </article>
  );
}

function SiteCard({ site, query = "" }: { site: Site; query?: string }) {
  return (
    <article className="card home-site-card p-5 flex flex-col gap-3 text-left">
      <div className="flex items-center gap-3">
        <SiteIcon site={site} size={34} />
        <div className="min-w-0">
          <Link
            to={`/sites/${site.slug}`}
            className="flex items-center gap-1.5 text-base font-bold hover:underline underline-offset-4"
            style={{ color: "var(--ink)" }}
          >
            <span className="truncate">
              <Highlight text={site.name} query={query} />
            </span>
            {site.verified && <VerifiedStamp size={14} />}
          </Link>
          <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
            {siteDomain(site.url)}
          </span>
        </div>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
        <Highlight text={site.description} query={query} />
      </p>

      <div className="flex flex-wrap gap-2 mt-auto">
        {site.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[11px] font-mono border px-2 py-0.5"
            style={{ color: "var(--muted)", borderColor: "var(--rule)" }}
          >
            <Highlight text={tag} query={query} />
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        {site.launched && (
          <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
            {formatDate(site.launched)}
          </span>
        )}
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-[11px] font-bold tracking-wider uppercase border px-3 py-1 transition-colors hover:bg-[#1a120b] hover:text-[#fff7ee]"
          style={{ color: "var(--ink)", borderColor: "var(--ink)" }}
        >
          Visit site <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}

function useSavedCollections(): [string[], (id: string) => void] {
  const [saved, setSaved] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("bi:collections");
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  });

  function toggle(id: string) {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("bi:collections", JSON.stringify(next));
        } catch {
          /* private mode */
        }
      }
      return next;
    });
  }

  return [saved, toggle];
}

/* ---------------- page ---------------- */

export default function Home() {
  // ?q= and ?category= keep the side navigation and this page in sync.
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const selectedCategory = params.get("category") ?? "all";
  const [savedCollections, toggleSaved] = useSavedCollections();
  const [showAllSites, setShowAllSites] = useState(false);
  const lastRandom = useRef<string | null>(null);

  const additions = useMemo(() => newAdditions(exploreConfig.newAdditionsLimit), []);
  const interesting = useMemo(() => interestingSites(), []);
  const editorPickSites = useMemo(() => editorsPicks(), []);
  const picks = useMemo(() => featuredSiteRows(exploreConfig.featuredSitesLimit), []);
  const seoNewSites = useMemo(
    () => additions.slice(0, 10).map((site) => ({ name: site.name, url: site.url, description: site.description })),
    [additions],
  );
  const seoFeaturedSites = useMemo(
    () => picks.slice(0, 10).map((site) => ({ name: site.name, url: site.url, description: site.description })),
    [picks],
  );

  const filtered = useMemo(() => {
    if (query.trim()) return searchSites(query);
    return sitesByCategory(selectedCategory);
  }, [query, selectedCategory]);

  const trending = trendingSites(exploreConfig.trendingPreviewCount);
  const trendingAll = trendingSites(sites.length).length;
  const seoTrendingSites = useMemo(
    () => trending.slice(0, 10).map((site) => ({ name: site.name, url: site.url, description: site.description })),
    [trending],
  );

  // A chosen category replaces the whole page with that category's sites.
  const searching = query.trim().length > 0;
  const category = categoryById(selectedCategory);
  const browsingCategory = !searching && Boolean(category);

  /** One random site from the whole directory — never the same one twice in a row. */
  function openRandomSite() {
    const pool = lastRandom.current
      ? sites.filter((site) => site.id !== lastRandom.current)
      : sites;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) return;
    lastRandom.current = pick.id;
    window.open(pick.url, "_blank", "noopener,noreferrer");
  }

  function updateParams(next: { q?: string; category?: string }) {
    const draft = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all") draft.delete(key);
      else draft.set(key, value);
    }
    setShowAllSites(false);
    setParams(draft, { replace: true, preventScrollReset: true });
  }

  const switcher = (
    <section className="flex flex-col gap-4">
      {/* The page's own headline, then what the place is, then the ways to
          browse, then the crowd. */}
      <h2 className="find-title">Cure boredom, find launches</h2>

      {/* Right under the headline: one promise at a time, rising in with the
          rotator. */}
      <section className="find-intro">
        <FindRotator />
        <p className="sr-only">
          A cool site that finds interesting sites and recent launches, helps your own site get
          discovered, earns a featured-on badge, and points you at useful tools.
        </p>
      </section>

      {/* Above the search box: one click, one random site, in a new tab. */}
      <div className="bored-row">
        <button
          type="button"
          className="bored-btn"
          onClick={openRandomSite}
          title="Open a random site from the list in a new tab"
        >
          <span aria-hidden="true">🎲</span> I’m bored
        </button>
        <Link to="/this-or-that" className="bored-btn">
          <span aria-hidden="true">🆚</span> This or that
        </Link>
        <span className="bored-note">One random site, or two to vote on.</span>
      </div>

      <AvatarRow />

      <label htmlFor="site-search" className="sr-only">
        Search launched sites
      </label>
      <div className="search-box">
        <span className="search-glyph" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12.8 12.8 L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <input
          id="site-search"
          type="search"
          placeholder="Search sites, tags, categories…"
          value={query}
          onChange={(e) => {
            updateParams({ q: e.target.value, category: undefined });
          }}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          className="field search-field text-base"
          style={{ borderColor: "var(--ink)" }}
        />
        {query.length > 0 && (
          <button
            type="button"
            className="search-clear"
            onClick={() => updateParams({ q: undefined })}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      <div className="chip-row" role="group" aria-label="Filter the list by category">
        {categoryFilters.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => updateParams({ category: cat.id, q: undefined })}
            className="chip"
            aria-pressed={selectedCategory === cat.id}
            style={{
              backgroundColor: selectedCategory === cat.id ? "var(--accent)" : "#ffffff",
              color: selectedCategory === cat.id ? "var(--on-accent)" : "var(--ink)",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </section>
  );

  if (browsingCategory && category) {
    return (
      <>
        <HomepageSeo
          newSites={seoNewSites}
          featuredSites={seoFeaturedSites}
          trendingSites={seoTrendingSites}
        />
        <div
          id="explore"
          className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col gap-8 scroll-mt-28"
        >
          {switcher}

          <section className="space-y-5">
            <div
              className="flex flex-col gap-2 border-b pb-4"
              style={{ borderColor: "var(--rule)" }}
            >
              <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
                Category
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em]">
                {category.label}
              </h2>
              {category.blurb && (
                <p
                  className="max-w-2xl text-base leading-relaxed"
                  style={{ color: "var(--muted)" }}
                >
                  {category.blurb}
                </p>
              )}
              <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
                {filtered.length} site{filtered.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="home-site-grid grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((site) => (
                <SiteCard key={site.id} site={site} />
              ))}
            </div>

            <p className="text-sm" style={{ color: "var(--muted)" }}>
              <button
                type="button"
                className="accent-text font-bold underline underline-offset-4"
                onClick={() => updateParams({ category: "all" })}
              >
                ← Back to all {sites.length} sites
              </button>
            </p>
          </section>
        </div>
      </>
    );
  }

  if (searching) {
    return (
      <>
        <HomepageSeo
          newSites={seoNewSites}
          featuredSites={seoFeaturedSites}
          trendingSites={seoTrendingSites}
        />
        <h1 className="sr-only">Search sites on {siteName}</h1>
        <div
          id="explore"
          className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col gap-8 scroll-mt-28"
        >
          {switcher}
          <section id="all-sites" className="space-y-4 scroll-mt-28" aria-live="polite">
            <div
              className="sec-head flex items-end justify-between gap-4 border-b pb-3"
              style={{ borderColor: "var(--rule)" }}
            >
              <div>
                <span className="section-eyebrow">Matching your search</span>
                <h2 className="text-xl font-bold tracking-[-0.01em]">
                  Results for “{query.trim()}”
                </h2>
              </div>
            </div>
            {filtered.length > 0 ? (
              <>
                <div className="home-site-grid grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {(showAllSites ? filtered : filtered.slice(0, SITE_PAGE)).map((site) => (
                    <SiteCard key={site.id} site={site} query={query} />
                  ))}
                </div>
                {!showAllSites && filtered.length > SITE_PAGE && (
                  <div className="show-more-row">
                    <button type="button" className="btn ghost" onClick={() => setShowAllSites(true)}>
                      Show more sites
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="search-empty-state">
                <span aria-hidden="true">⌕</span>
                <p>No sites match “{query.trim()}”. Try another name, tag, or category.</p>
              </div>
            )}
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <HomepageSeo
        newSites={seoNewSites}
        featuredSites={seoFeaturedSites}
        trendingSites={seoTrendingSites}
      />
      {/* The page keeps a heading for search engines and screen readers. */}
      <h1 className="sr-only">{`${siteName} — ${siteTagline}`}</h1>
      <div
        id="explore"
        className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-8 sm:gap-12 scroll-mt-28"
      >
        {switcher}

        <LaunchesThisWeek />

        <PagedRows items={additions} title="New and Upcoming Websites" note="latest launches" />
        <PagedRows items={picks} title="Featured Sites" note="top ranked" />

        {interesting.length > 0 && (
          <PagedRows items={interesting} title="Very Interesting" note="worth a detour" />
        )}

        {editorPickSites.length > 0 && (
          <PagedRows items={editorPickSites} title="Editors’ Picks" note="chosen by the editors" />
        )}

        {/* Collections */}
        {collections.length > 0 && (
          <section id="collections" className="space-y-4 scroll-mt-28">
          <div
            className="sec-head flex items-end justify-between gap-4 border-b pb-3"
            style={{ borderColor: "var(--rule)" }}
          >
            <h2 className="text-xl font-bold tracking-[-0.01em]">Latest Collections</h2>
              <Link
                to="/collections"
                className="text-[11px] font-bold uppercase tracking-[0.14em] accent-text"
              >
                All {collections.length} collections →
              </Link>
            </div>
            <div className="home-collections-swipe grid grid-cols-1 gap-5 sm:grid-cols-2">
              {collections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  saved={savedCollections.includes(collection.id)}
                  onToggle={() => toggleSaved(collection.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Blog */}
        <section className="space-y-4">
          <div
            className="sec-head flex items-end justify-between gap-4 border-b pb-3"
            style={{ borderColor: "var(--rule)" }}
          >
            <h2 className="text-xl font-bold tracking-[-0.01em]">Featured Articles</h2>
            <Link to="/blog" className="text-[11px] font-bold uppercase tracking-[0.14em] accent-text">
              All notes →
            </Link>
          </div>
          <div className="home-article-swipe grid grid-cols-1 gap-5 sm:grid-cols-3">
            {FEATURED_POSTS.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="card p-5 flex flex-col gap-2"
              >
                <span className="text-[11px] font-mono" style={{ color: "var(--accent)" }}>
                  {formatDate(post.date)}
                </span>
                <h3 className="text-base font-bold leading-snug">{post.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
                  {post.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Trending trio */}
        {trending.length > 0 && (
          <section className="space-y-4">
            <div
              className="sec-head flex items-end justify-between gap-4 border-b pb-3"
              style={{ borderColor: "var(--rule)" }}
            >
              <h2 className="text-xl font-bold tracking-[-0.01em]">
                Trending <span aria-hidden="true">🔥</span>
              </h2>
              <Link to="/trending" className="text-sm font-bold accent-text underline underline-offset-4">
                See all {trendingAll} →
              </Link>
            </div>
            <ol className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {trending.map((site, index) => (
                <li key={site.id} className="card p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rank rank-top rank-${index + 1}`}>{index + 1}</span>
                    <SiteIcon site={site} size={26} label={false} />
                  </div>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold hover:underline underline-offset-4"
                    style={{ color: "var(--ink)" }}
                  >
                    {site.name}
                  </a>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
                    {site.description}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <NeedsSomeVotes />

        {/* Full directory */}
        <section id="all-sites" className="space-y-4 scroll-mt-28">
          <div
            className="sec-head flex items-end justify-between gap-4 border-b pb-3"
            style={{ borderColor: "var(--rule)" }}
          >
            <h2 className="text-xl font-bold tracking-[-0.01em]">
              {query ? "Search results" : selectedCategory === "all" ? "All sites" : categoryLabel(selectedCategory)}
            </h2>
            <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
              {filtered.length} site{filtered.length === 1 ? "" : "s"}
            </span>
          </div>

          {filtered.length > 0 ? (
            <>
              <div className="home-site-grid grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(showAllSites ? filtered : filtered.slice(0, SITE_PAGE)).map((site) => (
                  <SiteCard key={site.id} site={site} query={query} />
                ))}
              </div>

              {!showAllSites && filtered.length > SITE_PAGE && (
                <div className="show-more-row">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setShowAllSites(true)}
                  >
                    Show the other {filtered.length - SITE_PAGE} sites
                  </button>
                </div>
              )}
            </>
          ) : (
            <div
              className="border p-8 text-center text-sm"
              style={{ color: "var(--muted)", borderColor: "var(--rule)" }}
            >
              No sites match that search. Try a different term or clear the search box.
            </div>
          )}
        </section>

        {/* Closing call to action */}
        <section className="cta-band">
          <div className="cta-copy">
            <span className="cta-eyebrow">
              <span className="cta-blip" aria-hidden="true" />
              Add yourself
            </span>
            <h2 className="text-2xl font-bold tracking-[-0.02em]">Built something quiet?</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              If your site loads fast, skips the growth tactics, and respects attention, it belongs
              on the list. Every submission is read by hand — there is no queue, no paid placement,
              and no account to make.
            </p>
          </div>
          <div className="cta-actions">
            <Link to="/submit" className="btn accent">
              Submit your site
            </Link>
            <Link to="/trending" className="btn ghost">
              See what’s trending
            </Link>
          </div>
        </section>

        {/* A small box for anyone who just finished reading the closing note. */}
        <aside className="traffic-box">
          <div className="traffic-box-copy">
            <strong>Want to get traffic?</strong>
            <p>
              Try Advertise with Ben Launches — a clearly labeled spot, a hand-checked verified
              mark, or a one-off bit of help around a launch.
            </p>
          </div>
          <Link to="/advertise" className="traffic-box-link">
            Advertise with Ben Launches <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
    </>
  );
}

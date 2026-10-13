import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Highlight } from "../components/Highlight";
import { HomepageSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import { exploreConfig, siteDescription, siteName, type Site, type SiteCollection } from "../lib/siteData";
import { useDirectory } from "../lib/siteDirectory";
import { formatDate, posts } from "../lib/posts";
import { siteDomain, siteTileStyle } from "../lib/siteTile";
import { screenshotUrl } from "../lib/shots";

/** Only the newest handful of posts get a card in the home page's article row. */
const FEATURED_POSTS = posts.slice(0, 3);

/** How many directory cards a phone loads before it offers the rest. */
const SITE_PAGE = 9;

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) % 100000;
  return h;
}

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

/** Generated cover art — geometric shapes instead of stock photos. */
function CoverArt({ site }: { site: Site }) {
  const variant = hash(site.slug) % 3;
  const tint = siteTileStyle(site.slug).backgroundColor as string;

  return (
    <div className="cover" style={{ backgroundColor: tint }}>
      <svg className="cover-art" viewBox="0 0 200 120" aria-hidden="true">
        {variant === 0 && (
          <>
            <rect x="-20" y="78" width="150" height="14" rx="7" fill="var(--surface)" opacity="0.9" />
            <rect x="26" y="52" width="120" height="14" rx="7" fill="rgba(255,255,255,0.65)" />
            <rect x="-10" y="26" width="170" height="14" rx="7" fill="rgba(255,255,255,0.35)" />
          </>
        )}
        {variant === 1 && (
          <>
            <circle cx="46" cy="60" r="34" fill="var(--surface)" opacity="0.85" />
            <circle cx="118" cy="44" r="18" fill="rgba(255,255,255,0.55)" />
            <circle cx="150" cy="86" r="12" fill="rgba(255,255,255,0.4)" />
          </>
        )}
        {variant === 2 && (
          <>
            <path d="M-10 110 L70 -10 L110 -10 L30 110 Z" fill="var(--surface)" opacity="0.85" />
            <path d="M60 110 L140 -10 L162 -10 L82 110 Z" fill="rgba(255,255,255,0.45)" />
          </>
        )}
      </svg>

      <div className="cover-copy">
        <span className="cover-domain">{siteDomain(site.url)}</span>
        <span className="cover-name">{site.name}</span>
        <span className="cover-line">{site.description}</span>
      </div>
    </div>
  );
}

/**
 * The top picks get a real screenshot, rendered server-side by thum.io, with the
 * generated cover art kept as the fallback if that service is unreachable.
 */
function SitePreview({ site, priority = false }: { site: Site; priority?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (failed) return <CoverArt site={site} />;

  return (
    <span className="cover shot">
      <img
        src={screenshotUrl(site.url, 960, 800)}
        srcSet={`${screenshotUrl(site.url, 640, 533)} 640w, ${screenshotUrl(site.url, 960, 800)} 960w`}
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
        alt={`Screenshot of ${site.name}`}
        width={960}
        height={600}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      <span className="shot-badge">{siteDomain(site.url)}</span>
    </span>
  );
}

function FeatureCard({ site, priority = false }: { site: Site; priority?: boolean }) {
  return (
    <article className="feature-card">
      <a href={site.url} target="_blank" rel="noopener noreferrer" className="block">
        <SitePreview site={site} priority={priority} />
      </a>
      <div className="feature-foot">
        <SiteIcon site={site} size={32} />
        <div className="min-w-0">
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-bold hover:underline underline-offset-4"
            style={{ color: "var(--ink)" }}
          >
            <span className="truncate">{site.name}</span>
          </a>
          <p className="text-[12px] truncate" style={{ color: "var(--muted)" }}>
            {site.description}
          </p>
        </div>
      </div>
    </article>
  );
}

function SiteRow({ site }: { site: Site }) {
  return (
    <li className="site-row">
      <SiteIcon site={site} size={36} />
      <div className="min-w-0">
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[15px] font-bold truncate block hover:underline underline-offset-4"
          style={{ color: "var(--ink)" }}
        >
          {site.name}
        </a>
        <p className="text-[13px] truncate" style={{ color: "var(--muted)" }}>
          {site.description}
        </p>
      </div>
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
          <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
            {note}
          </span>
        )}
      </div>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
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

function PagedRows({ items, title, note }: { items: Site[]; title: string; note?: string }) {
  const [page, setPage] = useState(0);
  const perPage = exploreConfig.rowsPerPage;
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const current = items.slice(page * perPage, page * perPage + perPage);

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
      <ul className="grid gap-x-10 gap-y-1 sm:grid-cols-2">
        {current.map((site) => (
          <SiteRow key={site.id} site={site} />
        ))}
      </ul>
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
  const directory = useDirectory();
  const members = directory.collectionMembers(collection);

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

      <h3 className="mt-6 text-lg font-bold leading-snug">
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
    <article className="card p-5 flex flex-col gap-3 text-left">
      <div className="flex items-center gap-3">
        <SiteIcon site={site} size={34} />
        <div className="min-w-0">
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-bold block truncate hover:underline underline-offset-4"
            style={{ color: "var(--ink)" }}
          >
            <Highlight text={site.name} query={query} />
          </a>
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
        <span className="flex items-center gap-2">
          <Link
            to={`/sites/${site.slug}`}
            className="text-[11px] font-bold tracking-wider uppercase underline underline-offset-4"
            style={{ color: "var(--muted)" }}
          >
            Details
          </Link>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-[11px] font-bold tracking-wider uppercase border px-3 py-1 transition-colors hover:bg-[#1a120b] hover:text-[#fff7ee]"
            style={{ color: "var(--ink)", borderColor: "var(--ink)" }}
          >
            Visit site <span aria-hidden="true">→</span>
          </a>
        </span>
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

/** The top of the page: what this is, how big the list is, and where to start. */
function Hero() {
  const directory = useDirectory();
  const used = directory.categoriesInUse();
  const newest = directory.newest(1)[0];
  const stats = [
    { value: directory.sites.length, label: "sites listed" },
    { value: used.length, label: "categories" },
    { value: directory.collections.length, label: "collections" },
  ];

  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="hero-eyebrow">
          <span className="hero-blip" aria-hidden="true" />
          {siteName} — the list
        </span>
        <h1 className="hero-title">
          A <span className="hero-em">quiet</span> corner of the web, kept small on purpose.
        </h1>
        <p className="hero-lede">{siteDescription}</p>
        {newest && (
          <p className="hero-live">
            <span className="hero-blip" aria-hidden="true" />
            Newest on the list:{" "}
            <Link
              to={`/sites/${newest.slug}`}
              className="font-bold accent-text underline underline-offset-4"
            >
              {newest.name}
            </Link>
            {newest.launched && <span className="hero-live-date"> · {formatDate(newest.launched)}</span>}
            {directory.submittedCount > 0 && (
              <span className="hero-live-date">
                {" "}
                · {directory.submittedCount} accepted from the submit form
              </span>
            )}
          </p>
        )}
        <div className="hero-actions">
          <a href="#all-sites" className="btn accent">
            Browse the list
          </a>
          <Link to="/submit" className="btn ghost">
            Submit your site
          </Link>
        </div>
        <dl className="hero-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="hero-stat">
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="hero-art">
        <div className="hero-bars" aria-hidden="true">
          <span className="hero-bar" />
          <span className="hero-bar hero-bar-accent" />
          <span className="hero-bar hero-bar-short" />
        </div>
        <p className="hero-art-note">
          <span className="hero-art-kicker">edited by hand</span>
          No growth tactics, no infinite scroll, no accounts required.
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  // ?q= and ?category= keep the side navigation and this page in sync.
  const [params, setParams] = useSearchParams();
  const directory = useDirectory();
  const query = params.get("q") ?? "";
  const selectedCategory = params.get("category") ?? "all";
  const [savedCollections, toggleSaved] = useSavedCollections();
  const [showAllSites, setShowAllSites] = useState(false);

  const featured = useMemo(() => directory.featuredSites(), [directory]);
  const additions = useMemo(
    () => directory.newest(exploreConfig.newAdditionsLimit),
    [directory],
  );
  const picks = useMemo(
    () => directory.featuredRows(exploreConfig.featuredSitesLimit),
    [directory],
  );

  const filtered = useMemo(() => {
    if (query.trim()) return directory.searchSites(query);
    return directory.sitesByCategory(selectedCategory);
  }, [directory, query, selectedCategory]);

  // A fresh search or category starts collapsed again.
  useEffect(() => {
    setShowAllSites(false);
  }, [query, selectedCategory]);

  const trending = directory.trending(exploreConfig.trendingPreviewCount);
  const trendingAll = directory.sites.length;

  // A chosen category replaces the whole page with that category's sites.
  const searching = query.trim().length > 0;
  const category = directory.categoryById(selectedCategory);
  const browsingCategory = !searching && Boolean(category);
  const chips = directory.categoriesInUse();

  const switcher = (
    <section className="flex flex-col gap-4">
      <label htmlFor="site-search" className="sr-only">
        Search launched sites
      </label>
      <div className="search-box">
        <span className="search-glyph" aria-hidden="true">
          ⌕
        </span>
        <input
          id="site-search"
          type="search"
          placeholder={`Search ${directory.sites.length} sites, tags, categories…`}
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
      {query.trim() && (
        <p className="flex flex-wrap items-center gap-3 text-sm" style={{ color: "var(--muted)" }}>
          <span>
            <strong style={{ color: "var(--ink)" }}>{filtered.length}</strong>{" "}
            {filtered.length === 1 ? "site matches" : "sites match"} “
            <mark className="hl">{query.trim()}</mark>”
          </span>
          <button
            type="button"
            className="nav-btn"
            onClick={() => updateParams({ q: undefined })}
          >
            Clear search
          </button>
        </p>
      )}
      <div className="chip-row" role="group" aria-label="Filter the list by category">
        <button
          type="button"
          onClick={() => updateParams({ category: "all", q: undefined })}
          className="chip"
          aria-pressed={selectedCategory === "all"}
          style={{
            backgroundColor: selectedCategory === "all" ? "var(--accent)" : "#ffffff",
            color: selectedCategory === "all" ? "var(--on-accent)" : "var(--ink)",
          }}
        >
          All
          <span className="chip-count">{directory.sites.length}</span>
        </button>
        {/* Only categories that actually hold a site get a chip. */}
        {chips.map(({ category: cat, count }) => (
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
            <span className="chip-count">{count}</span>
          </button>
        ))}
      </div>
    </section>
  );

  if (browsingCategory && category) {
    return (
      <>
        <HomepageSeo />
        <div
          id="explore"
          className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col gap-8 scroll-mt-24"
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

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                ← Back to all {directory.sites.length} sites
              </button>
            </p>
          </section>
        </div>
      </>
    );
  }

  function updateParams(next: { q?: string; category?: string }) {
    const draft = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all") draft.delete(key);
      else draft.set(key, value);
    }
    setParams(draft, { replace: true, preventScrollReset: true });
  }

  return (
    <>
      <HomepageSeo />
      <div
        id="explore"
        className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-8 sm:gap-12 scroll-mt-24"
      >
        <Hero />

        {switcher}

        {directory.sites.length === 0 && (
          <div className="empty-list">
            <h2 className="text-xl font-bold tracking-[-0.01em]">The list is empty right now</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Nothing has been listed yet. Send the first site in and it will show up here — every
              card, category, and page on this screen is built from what is on the list.
            </p>
            <Link to="/submit" className="btn accent">
              Submit your site
            </Link>
          </div>
        )}

        {/* Featured band */}
        {featured.length > 0 && (
          <section className="grid gap-5 sm:grid-cols-2">
            {featured.map((site, index) => (
              <FeatureCard key={site.id} site={site} priority={index === 0} />
            ))}
          </section>
        )}

        {additions.length > 0 && (
          <PagedRows
            items={additions}
            title="New Additions"
            note={directory.latestLaunch ? `newest ${formatDate(directory.latestLaunch)}` : "latest launches"}
          />
        )}
        {picks.length > 0 && (
          <PagedRows items={picks} title="Featured Sites" note="top ranked" />
        )}

        {/* Collections */}
        {directory.collections.length > 0 && (
          <section id="collections" className="space-y-4 scroll-mt-24">
          <div
            className="sec-head flex items-end justify-between gap-4 border-b pb-3"
            style={{ borderColor: "var(--rule)" }}
          >
            <h2 className="text-xl font-bold tracking-[-0.01em]">Latest Collections</h2>
              <Link
                to="/collections"
                className="text-[11px] font-bold uppercase tracking-[0.14em] accent-text"
              >
                All {directory.collections.length} collections →
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {directory.collections.map((collection) => (
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
          <div className="grid gap-5 sm:grid-cols-3">
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
            <ol className="grid gap-5 sm:grid-cols-3">
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

        {/* Full directory */}
        <section id="all-sites" className="space-y-4 scroll-mt-24">
          <div
            className="sec-head flex items-end justify-between gap-4 border-b pb-3"
            style={{ borderColor: "var(--rule)" }}
          >
            <h2 className="text-xl font-bold tracking-[-0.01em]">
              {query
                ? "Search results"
                : selectedCategory === "all"
                  ? "All sites"
                  : `${category?.label ?? selectedCategory} sites`}
            </h2>
            <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
              {filtered.length} site{filtered.length === 1 ? "" : "s"}
            </span>
          </div>

          {filtered.length > 0 ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
            <span className="hero-eyebrow">
              <span className="hero-blip" aria-hidden="true" />
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
      </div>
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Highlight } from "./Highlight";
import { SiteIcon } from "./SiteIcon";
import { useDirectory } from "../lib/siteDirectory";
import { navContextFor, type NavAction } from "../lib/navActions";
import { siteDomain } from "../lib/siteTile";
import { posts } from "../lib/posts";

/** How many quick matches the side search shows while you type. */
const SEARCH_PREVIEW = 6;

/** The four top-level places in the site. */
const SECTIONS = [
  { id: "explore", to: "/#explore", icon: "◎", label: "Explore" },
  { id: "articles", to: "/blog", icon: "◫", label: "Articles" },
  { id: "collections", to: "/collections", icon: "❐", label: "Collections" },
  { id: "trending", to: "/trending", icon: "✦", label: "Trending" },
] as const;

function scrollToSection(id: string) {
  const element = document.getElementById(id);
  if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SectionToggle({
  label,
  open,
  onToggle,
  badge,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      className="sidenav-toggle"
      onClick={onToggle}
      aria-expanded={open}
    >
      <span>{label}</span>
      <span className="flex items-center gap-2">
        {badge && <span className="sidenav-badge">{badge}</span>}
        <span className={`chev${open ? " chev-open" : ""}`} aria-hidden="true">
          ⌄
        </span>
      </span>
    </button>
  );
}

/**
 * The navigation itself — rendered inside the floating desktop panel and
 * inside the mobile drawer so both stay in sync.
 */
export function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const directory = useDirectory();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const pendingSection = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return { categories: true };
    try {
      const raw = window.localStorage.getItem("bi:nav-groups");
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : { categories: true };
    } catch {
      return { categories: true };
    }
  });

  // After a jump like /#explore, scroll the section into view once it exists.
  useEffect(() => {
    const id = pendingSection.current;
    if (!id) return;
    pendingSection.current = null;
    const frame = requestAnimationFrame(() => scrollToSection(id));
    const timer = window.setTimeout(() => scrollToSection(id), 160);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [location.key, location.pathname, location.search, location.hash]);

  // Live matches for the nav search box: names, tags, descriptions, category.
  const matches = useMemo(
    () => (query.trim() ? directory.searchSites(query) : []),
    [directory, query],
  );

  // The action rows follow the visitor around the site.
  const context = useMemo(
    () => navContextFor(location.pathname, location.search, directory),
    [directory, location.pathname, location.search],
  );

  // Close the results list when the pointer goes elsewhere.
  useEffect(() => {
    if (!searchOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [searchOpen]);

  // ⌘K / Ctrl+K focuses the search field.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /** Where the visitor actually is right now. */
  const activeSection = useMemo(() => {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/blog" || path.startsWith("/blog/")) return "articles";
    if (path === "/trending") return "trending";
    if (path === "/collections" || path.startsWith("/collections/")) return "collections";
    if (path === "/submit") return "submit";
    if (path === "/") return "explore";
    return "";
  }, [location.pathname]);

  const activeCategory = useMemo(() => {
    if (location.pathname !== "/") return "";
    return new URLSearchParams(location.search).get("category") ?? "";
  }, [location.pathname, location.search]);

  /** True when an action points at the exact page (and filters) we are on. */
  function isCurrent(action: NavAction): boolean {
    if (!action.to) return false;
    const [target] = action.to.split("#");
    if (!target) return false;
    const [path, query = ""] = target.split("?");
    const here = `${location.pathname.replace(/\/+$/, "") || "/"}${location.search}`;
    const there = `${(path || "/").replace(/\/+$/, "") || "/"}${query ? `?${query}` : ""}`;
    return here === there;
  }

  function toggleGroup(id: string) {
    setOpenGroups((current) => {
      const next = { ...current, [id]: !current[id] };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("bi:nav-groups", JSON.stringify(next));
        } catch {
          /* private mode */
        }
      }
      return next;
    });
  }

  /** Navigate, and make in-page jumps land on the right section every time. */
  function go(to: string) {
    onNavigate?.();
    const hashIndex = to.indexOf("#");
    const id = hashIndex === -1 ? "" : to.slice(hashIndex + 1);
    const href = hashIndex === -1 ? to : `${to.slice(0, hashIndex)}#${id}`;
    const current = `${location.pathname}${location.search}${location.hash}`;

    if (href === current) {
      if (id) scrollToSection(id);
      return;
    }
    if (!id) {
      navigate(to);
      return;
    }
    pendingSection.current = id;
    navigate(href);
  }

  function runSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    setSearchOpen(false);
    go(trimmed ? `/?q=${encodeURIComponent(trimmed)}#explore` : "/#explore");
  }

  const showResults = searchOpen && query.trim().length > 0;

  return (
    <div className="sidenav-body">
      <div className="sidenav-search-wrap" ref={searchRef}>
        <form className="sidenav-search" onSubmit={runSearch} role="search">
          <span aria-hidden="true" className="sidenav-search-icon">
            ⌕
          </span>
          <label htmlFor="nav-search" className="sr-only">
            Search sites by title, tag, or description
          </label>
          <input
            id="nav-search"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder={`Search ${directory.sites.length} sites`}
          />
          <span className="keycap" aria-hidden="true">
            ⌘K
          </span>
        </form>

        {showResults && (
          <div className="sidenav-results">
            {matches.length > 0 ? (
              matches.slice(0, SEARCH_PREVIEW).map((site) => (
                <a
                  key={site.id}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sidenav-result"
                  onClick={() => {
                    setSearchOpen(false);
                    onNavigate?.();
                  }}
                >
                  <SiteIcon site={site} size={22} label={false} />
                  <span className="sidenav-result-copy">
                    <span className="sidenav-result-name">
                      <Highlight text={site.name} query={query} />
                    </span>
                    <span className="sidenav-result-domain">{siteDomain(site.url)}</span>
                  </span>
                </a>
              ))
            ) : (
              <p className="sidenav-results-empty">No sites match “{query.trim()}”.</p>
            )}
            <button type="button" className="sidenav-results-all" onClick={() => go(`/?q=${encodeURIComponent(query.trim())}#explore`)}>
              {matches.length > 0
                ? `See all ${matches.length} results →`
                : "Search the full directory →"}
            </button>
          </div>
        )}
      </div>

      <nav aria-label="Site" className="sidenav-links">
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              className={`sidenav-item${isActive ? " active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => go(section.to)}
            >
              <span className="sidenav-icon" aria-hidden="true">
                {section.icon}
              </span>
              <span>{section.label}</span>
              {section.id === "articles" && (
                <span className="sidenav-badge">{posts.length}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidenav-divider" />

      <div className="sidenav-group sidenav-context">
        <span className="sidenav-context-title">{context.title}</span>
        {context.note && <span className="sidenav-context-note">{context.note}</span>}
        <div className="sidenav-sub">
          {context.actions.map((action) => {
            const current = isCurrent(action);
            const body = (
              <>
                <span className="sidenav-context-label">{action.label}</span>
                {action.badge && <span className="sidenav-badge">{action.badge}</span>}
              </>
            );
            return action.href ? (
              <a
                key={action.id}
                className="sidenav-subitem"
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onNavigate?.()}
              >
                {body}
              </a>
            ) : (
              <button
                key={action.id}
                type="button"
                className={`sidenav-subitem${current ? " active-sub" : ""}`}
                aria-current={current ? "true" : undefined}
                onClick={() => go(action.to ?? "/")}
              >
                {body}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sidenav-group">
        <SectionToggle
          label="Libraries"
          open={Boolean(openGroups.libraries)}
          onToggle={() => toggleGroup("libraries")}
        />
        {openGroups.libraries && (
          <div className="sidenav-sub">
            <button type="button" className="sidenav-subitem" onClick={() => go("/#explore")}>
              All sites <span className="sidenav-badge">{directory.sites.length}</span>
            </button>
            <button type="button" className="sidenav-subitem" onClick={() => go("/trending")}>
              Top {directory.sites.length} ranking
            </button>
            <button type="button" className="sidenav-subitem" onClick={() => go("/submit")}>
              Submit your site
            </button>
          </div>
        )}
      </div>

      <div className="sidenav-group">
        <SectionToggle
          label="Categories"
          open={openGroups.categories !== false}
          onToggle={() => toggleGroup("categories")}
        />
        {openGroups.categories !== false && (
          <div className="sidenav-sub">            {directory.categoriesInUse().map(({ category, count }) => (
              <button
                key={category.id}
                type="button"
                className={`sidenav-subitem${
                  activeCategory === category.id ? " active-sub" : ""
                }`}
                aria-current={activeCategory === category.id ? "true" : undefined}
                onClick={() => go(`/?category=${category.id}#explore`) }
              >
                {category.label}
                <span className="sidenav-badge">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sidenav-foot">
        {context.primary.href ? (
          <a
            className="sidenav-cta"
            href={context.primary.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onNavigate?.()}
          >
            {context.primary.label}
          </a>
        ) : (
          <button
            type="button"
            className="sidenav-cta"
            onClick={() => go(context.primary.to ?? "/")}
          >
            {context.primary.label}
          </button>
        )}
        {context.secondary.href ? (
          <a
            className="sidenav-foot-link"
            href={context.secondary.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onNavigate?.()}
          >
            {context.secondary.label}
          </a>
        ) : (
          <button
            type="button"
            className="sidenav-foot-link"
            onClick={() => go(context.secondary.to ?? "/#explore")}
          >
            {context.secondary.label}
          </button>
        )}
        <Link to="/auth" className="sidenav-foot-link" onClick={() => onNavigate?.()}>
          Sign in
        </Link>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigationType } from "react-router";
import { AccountMenu } from "./AccountMenu";
import { CartLink } from "./CartLink";
import { Footer } from "./Footer";
import { GamesMenu } from "./GamesMenu";
import { MobileNav, HamburgerButton } from "./MobileNav";
import { SearchOverlay } from "./SearchOverlay";
import { trackPageView } from "../lib/analytics";

/**
 * The promo strip is a one-time offer: it is shown on the first visit that
 * reaches the home page and never again, which the browser remembers.
 */
const PROMO_SEEN_KEY = "bi:promo-seen:v1";

function promoAlreadySeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PROMO_SEEN_KEY) === "1";
  } catch {
    // Private mode: nothing can be remembered, so let it show each visit.
    return false;
  }
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
    >
      {children}
    </NavLink>
  );
}

/** Left-to-right order of the top-level tabs, so we can slide in the right direction. */
const TAB_ORDER = [
  "/",
  "/discover-websites",
  "/new-websites",
  "/this-or-that",
  "/site-tinder",
  "/sites",
  "/trending",
  "/blog",
  "/collections",
  "/submit",
  "/terms",
  "/privacy",
  "/admin",
  "/auth",
];

/** Only the main screens keep the full footer; utility pages end with the page. */
const FOOTER_ROUTES = new Set([
  "/",
  "/discover-websites",
  "/new-websites",
  "/this-or-that",
  "/trending",
  "/blog",
  "/collections",
  "/submit",
  "/advertise",
  "/terms",
  "/privacy",
  "/stats",
]);

function tabIndex(pathname: string): number {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return 0;
  const index = TAB_ORDER.findIndex(
    (tab) => tab !== "/" && (path === tab || path.startsWith(`${tab}/`)),
  );
  return index === -1 ? TAB_ORDER.length : index;
}

/** Remember the tab we came from so the new pane slides the right way. */
function useSlideDirection(pathname: string): "left" | "right" {
  const previous = useRef({ path: pathname, direction: "right" as "left" | "right" });
  if (previous.current.path !== pathname) {
    const direction =
      tabIndex(pathname) >= tabIndex(previous.current.path) ? "right" : "left";
    previous.current = { path: pathname, direction };
  }
  return previous.current.direction;
}

/** A phone-friendly "back to the top" button for the long directory page. */
function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 900);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toTop = useCallback(() => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, []);

  if (!visible) return null;

  return (
    <button type="button" className="to-top" onClick={toTop} aria-label="Back to top">
      <span aria-hidden="true">↑</span>
    </button>
  );
}

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(() => !promoAlreadySeen());
  const headerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigationType = useNavigationType();
  const direction = useSlideDirection(location.pathname);
  const path = location.pathname.replace(/\/+$/, "") || "/";

  /*
    The mobile menu fills the screen below the header, so the drawer needs the
    header's real height — it changes when the promo bar wraps or the brand row
    shrinks on a narrow phone. Publish it as `--header-h` for the CSS.
  */
  useEffect(() => {
    const element = headerRef.current;
    if (!element) return;

    const publish = () => {
      document.documentElement.style.setProperty(
        "--header-h",
        `${Math.round(element.getBoundingClientRect().height)}px`,
      );
    };
    publish();

    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(publish) : null;
    observer?.observe(element);
    window.addEventListener("resize", publish);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", publish);
    };
  }, []);

  /*
    A screen you navigate to starts at the top. Without this, following a link
    from halfway down the directory dropped you halfway down the next page, so a
    site's own page opened part-way through its details. In-page jumps keep
    their hash (the nav scrolls those to the section), and going back leaves the
    browser's own scroll restoration alone.
  */
  useEffect(() => {
    if (location.hash || navigationType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname, location.hash, navigationType]);

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  // Mark the promo as seen the moment it is actually on screen. Only writing
  // storage here — never state — keeps the strip from reappearing later.
  const showPromo = path === "/" && promoOpen;
  useEffect(() => {
    if (!showPromo) return;
    try {
      window.localStorage.setItem(PROMO_SEEN_KEY, "1");
    } catch {
      /* private mode */
    }
  }, [showPromo]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="site-header" ref={headerRef}>
        {/* Slim promo bar: what we do for a launch, and the way to start one.
            It only belongs on the home screen — every other page opens on the
            brand row, which also keeps the header (and the mobile menu that
            hangs off its height) shorter. */}
        {showPromo && (
          <div className="promo-bar">
            <p className="promo-bar-copy">
              Enhance your site’s SEO{" "}
              <span className="promo-bar-note">
                — get in front of people looking for quiet, fast sites
              </span>
            </p>
            <Link to="/submit" className="promo-bar-cta">
              Launch your site <span aria-hidden="true">→</span>
            </Link>
            <button
              type="button"
              className="promo-bar-close"
              onClick={() => setPromoOpen(false)}
              aria-label="Dismiss this message"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}

        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-1.5 sm:py-2 grid grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Link to="/" className="justify-self-start">
            <span className="brand-mark">Ben Launches</span>
          </Link>

          <nav
            className="site-header-nav hidden lg:flex justify-self-center items-center"
            aria-label="Main"
          >
            <a
              href="/#explore"
              className={`nav-link${path === "/" ? " active" : ""}`}
              aria-current={path === "/" ? "page" : undefined}
            >
              Explore
            </a>
            <NavItem to="/discover-websites">Discover</NavItem>
            <NavItem to="/new-websites">New</NavItem>
            <NavItem to="/trending">
              <span className="whitespace-nowrap">
                Trending <span aria-hidden="true">🔥</span>
              </span>
            </NavItem>
            <GamesMenu />
            <NavItem to="/blog">Blog</NavItem>
          </nav>

          <div className="justify-self-end flex items-center gap-2">
            <SearchOverlay />
            <CartLink />
            <AccountMenu />
            <HamburgerButton open={navOpen} onClick={() => setNavOpen((open) => !open)} />
          </div>
        </div>
      </header>

      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />

      {/*
        The page now owns the full width: the side rail is gone on desktop, so
        the directory reads edge to edge with one centered column per page.
      */}
      <div className="flex-1 w-full lg:pb-12">
        <main className="min-w-0">
          <div key={location.pathname} className={`route-pane slide-${direction}`}>
            <Outlet />
          </div>
        </main>
      </div>

      {FOOTER_ROUTES.has(path) && <Footer />}

      <BackToTop />
    </div>
  );
}

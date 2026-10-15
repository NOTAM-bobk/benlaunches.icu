import { Link, useLocation } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { sites } from "../lib/siteData";

/** A few doors out of the dead end, in the order a visitor would want them. */
const DOORS: Array<{ to: string; label: string }> = [
  { to: "/discover-websites", label: "Discover websites" },
  { to: "/new-websites", label: "New launches" },
  { to: "/trending", label: "Trending" },
  { to: "/collections", label: "Collections" },
  { to: "/blog", label: "Notes" },
  { to: "/submit", label: "Submit your site" },
];

/**
 * The screen for a URL that does not exist. It used to be React Router's own
 * error page; this one keeps the header, the footer and the site's paper-and-ink
 * look, and offers a way back rather than a stack trace.
 */
export default function NotFound() {
  const { pathname, search } = useLocation();
  const asked = `${pathname}${search}`;

  return (
    <>
      <SiteSeo
        title="Page not found"
        description="That page is not part of the directory."
        path="/404"
        noindex
      />
      <main className="not-found mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <span className="not-found-code" aria-hidden="true">
          404
        </span>
        <h1 className="not-found-title">This page wandered off</h1>
        <p className="not-found-copy">
          Nothing lives at <code>{asked}</code> — but all {sites.length} sites in the directory are
          still where you left them.
        </p>

        <div className="not-found-actions">
          <Link to="/" className="btn accent">
            Back to the directory
          </Link>
          <Link to="/this-or-that" className="btn ghost">
            Play This or That
          </Link>
        </div>

        <nav className="not-found-doors" aria-label="Popular pages">
          {DOORS.map((door) => (
            <Link key={door.to} to={door.to} className="not-found-door">
              {door.label} <span aria-hidden="true">→</span>
            </Link>
          ))}
        </nav>
      </main>
    </>
  );
}

import { Link } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { siteName } from "../lib/siteData";

/** Shown for any route the router does not know. */
export default function NotFound() {
  return (
    <>
      <SiteSeo
        title="Page not found"
        description={`The page you were looking for is not on ${siteName}. Head back to the homepage to browse the directory.`}
        path="/404"
        noindex
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 flex flex-col gap-4 text-center">
        <p className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">404</p>
        <h1 className="text-3xl font-bold">This page could not be found</h1>
        <p className="leading-relaxed" style={{ color: "var(--muted)" }}>
          The address may have moved, or it never existed. Nothing is broken on your end —
          the directory is still right where you left it.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="border px-4 py-2 text-sm font-bold"
            style={{ borderColor: "var(--ink)" }}
          >
            Back to the homepage
          </Link>
          <Link
            to="/discover-websites"
            className="border px-4 py-2 text-sm font-bold"
            style={{ borderColor: "var(--rule)" }}
          >
            Discover websites
          </Link>
        </div>
      </div>
    </>
  );
}

import { Link } from "react-router";
import { FeatureBadges } from "./FeatureBadges";
import { appVersion, siteLinks } from "../lib/siteData";

/** Link columns, kept apart from the markup so the footer stays readable. */
const DIRECTORY_LINKS: { to: string; label: string }[] = [
  { to: "/", label: "Home" },
  { to: "/discover-websites", label: "Discover websites" },
  { to: "/new-websites", label: "New & upcoming websites" },
  { to: "/blog", label: "Blog" },
  { to: "/collections", label: "Collections" },
  { to: "/trending", label: "Trending 🔥" },
  { to: "/submit", label: "Submit your site" },
  { to: "/advertise", label: "Advertise with Boring Internet" },
  { to: "/stats", label: "Directory stats" },
];

const LEGAL_LINKS: { to: string; label: string }[] = [
  { to: "/terms", label: "Terms of service" },
  { to: "/privacy", label: "Privacy policy" },
  { to: "/privacy#cookies", label: "Cookies" },
];

const CONNECT_LINKS: { href: string; label: string }[] = [
  { href: siteLinks.contact ?? "mailto:hello@base31.org", label: "Contact" },
  { href: "https://github.com/NOTAM-bobk/benlaunches.icu", label: "GitHub" },
];

export function Footer() {
  return (
    <footer
      className="footer w-full border-t mt-auto"
      style={{ backgroundColor: "#ffffff", borderColor: "var(--ink)" }}
    >
      <div className="footer-inner w-full px-5 sm:px-8 lg:px-12 py-10 sm:py-12 flex flex-col gap-10 text-sm">
        <div className="footer-intro">
          <div className="flex flex-col gap-3">
            <span
              className="text-[11px] font-bold tracking-[0.2em] uppercase"
              style={{ color: "var(--ink)" }}
            >
              Boring Internet
            </span>
            <p className="max-w-md leading-relaxed" style={{ color: "var(--muted)" }}>
              A small directory of launched sites. Edited by hand, kept minimal on purpose.
            </p>
          </div>
        </div>

        <div className="footer-link-grid">
          <div className="footer-link-group">
            <p
              className="text-[11px] font-bold tracking-[0.2em] uppercase"
              style={{ color: "var(--ink)" }}
            >
              Directory
            </p>
            <ul className="mt-3 space-y-2">
              {DIRECTORY_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="nav-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-link-group">
            <p
              className="text-[11px] font-bold tracking-[0.2em] uppercase"
              style={{ color: "var(--ink)" }}
            >
              Connect
            </p>
            <ul className="mt-3 space-y-2">
              {CONNECT_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    {...(link.href.startsWith("http")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="nav-link"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-link-group footer-legal-group">
            <p
              className="text-[11px] font-bold tracking-[0.2em] uppercase"
              style={{ color: "var(--ink)" }}
            >
              Legal
            </p>
            <ul className="mt-3 space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="nav-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <FeatureBadges />

        <div
          className="footer-meta flex flex-col gap-2 text-[11px] border-t pt-6"
          style={{ color: "var(--muted)", borderColor: "var(--rule)" }}
        >
          <div className="footer-meta-row flex flex-wrap items-center justify-between gap-3">
            <p>
              © {new Date().getFullYear()} Boring Internet · v{appVersion}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/changelog"
                className="nav-link changelog-link text-[10px] font-bold tracking-[0.16em] uppercase"
              >
                Changelog <span className="changelog-link-version">v{appVersion}</span>
              </Link>
              <Link to="/terms" className="nav-link text-[10px] font-bold tracking-[0.16em] uppercase">
                Terms
              </Link>
              <Link to="/privacy" className="nav-link text-[10px] font-bold tracking-[0.16em] uppercase">
                Privacy
              </Link>
              <Link to="/admin" className="nav-link text-[10px] font-bold tracking-[0.16em] uppercase">
                Admin panel
              </Link>
            </div>
          </div>
          <p>
            Sites are curated by their creators. This directory links out; it does not host them.
          </p>
        </div>
      </div>
    </footer>
  );
}

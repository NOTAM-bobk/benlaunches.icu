import { SiteSeo } from "../components/SeoHead";
import { appVersion, changelog, siteName, siteUrl } from "../lib/siteData";

/** Release dates are plain days, so format them without a timezone shift. */
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
}

/**
 * The release notes, read straight from `config/changelog.json`. Adding a
 * release is a config edit — newest entry first, with the matching `version`.
 */
export default function Changelog() {
  return (
    <>
      <SiteSeo
        title="Changelog"
        description={`What changed and when on ${siteName} — every release, newest first.`}
        path="/changelog"
        keywords={["changelog", "release notes", `${siteName} updates`]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${siteName} changelog`,
            url: `${siteUrl}/changelog`,
            description: "Release notes for this directory, newest first.",
            inLanguage: "en",
          },
        ]}
      />

      <main className="changelog-page mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <header className="changelog-head">
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
            Changelog
          </span>
          <h1>Version {appVersion}, and everything before it</h1>
          <p>{changelog.intro}</p>
          {changelog.updated && (
            <p className="changelog-updated">
              Latest release <time dateTime={changelog.updated}>{formatDate(changelog.updated)}</time>
            </p>
          )}
        </header>

        <ol className="changelog-list">
          {changelog.entries.map((entry) => (
            <li key={`${entry.version}-${entry.date}`} className="changelog-entry">
              <div className="changelog-entry-head">
                <span className="changelog-version">v{entry.version}</span>
                {entry.version === appVersion && (
                  <span className="changelog-current">Current</span>
                )}
                <time className="changelog-date" dateTime={entry.date}>
                  {formatDate(entry.date)}
                </time>
              </div>
              <h2>{entry.title}</h2>
              <ul className="changelog-changes">
                {entry.changes.map((change) => (
                  <li key={change}>
                    <span aria-hidden="true">✦</span>
                    {change}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <p className="changelog-foot">
          Something missing or wrong? Tell us on the{" "}
          <a href="https://github.com/NOTAM-bobk/benlaunches.icu" target="_blank" rel="noopener noreferrer">
            GitHub repository
          </a>
          .
        </p>
      </main>
    </>
  );
}

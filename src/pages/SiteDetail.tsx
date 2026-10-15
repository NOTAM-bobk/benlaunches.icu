import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router";
import { ReportProblem } from "../components/ReportProblem";
import { ShareSite } from "../components/ShareSite";
import { useSignInPrompt } from "../lib/signInPrompt";
import { SiteIcon } from "../components/SiteIcon";
import { VerifiedStamp } from "../components/VerifiedStamp";
import { SiteSeo } from "../components/SeoHead";
import { avatarUrl, getSiteSupporters, useAuth, type SiteSupporter } from "../lib/auth";
import { screenshotUrl } from "../lib/shots";
import { useSiteVote } from "../lib/votes";
import {
  categoryLabel,
  collections,
  humanizeKey,
  rankedSites,
  siteBySlug,
  siteName,
  siteUrl,
  sites,
  sitesByCategory,
} from "../lib/siteData";
import { formatDate } from "../lib/posts";
import { siteDomain } from "../lib/siteTile";

/** Keep longer submitted details in a predictable, readable order. */
const DETAIL_ORDER = [
  "tagline",
  "launchDate",
  "targetAudience",
  "problem",
  "features",
  "useCases",
  "alternatives",
  "pricing",
  "openSource",
  "socialLinks",
  "faq",
];

export default function SiteDetail() {
  const { slug = "" } = useParams();
  const { user, toggleSaved } = useAuth();
  const askSignIn = useSignInPrompt();
  const site = siteBySlug(slug);
  const vote = useSiteVote(slug, site?.trending ?? 0);
  const [supporters, setSupporters] = useState<SiteSupporter[]>([]);

  useEffect(() => {
    let active = true;
    if (!site) return () => { active = false; };
    void getSiteSupporters(site.slug).then((value) => {
      if (active) setSupporters(value);
    });
    return () => { active = false; };
  }, [site?.slug]);

  if (!site) {
    return (
      <>
        <SiteSeo title="Site not found" path={`/sites/${slug}`} noindex />
        <main className="site-not-found mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
          <span className="site-detail-kicker">404 · Not in the directory</span>
          <h1>That site is not listed</h1>
          <p>“{slug}” is not one of the {sites.length} sites on {siteName}.</p>
          <Link to="/" className="btn accent">Browse the list</Link>
        </main>
      </>
    );
  }

  const rank = rankedSites().findIndex((entry) => entry.slug === site.slug) + 1;
  const lists = collections.filter((collection) => collection.siteSlugs.includes(site.slug));
  const neighbours = sitesByCategory(site.category)
    .filter((entry) => entry.slug !== site.slug)
    .slice(0, 6);
  const builderSites = neighbours;
  const siteSlug = site.slug;
  async function voteAndRefreshSupporters() {
    await vote.vote();
    const updated = await getSiteSupporters(siteSlug);
    setSupporters(updated);
  }
  const domain = siteDomain(site.url);
  const extras = Object.entries(site.extras ?? {}).sort(([left], [right]) => {
    const leftOrder = DETAIL_ORDER.indexOf(left);
    const rightOrder = DETAIL_ORDER.indexOf(right);
    if (leftOrder === -1 && rightOrder === -1) return left.localeCompare(right);
    if (leftOrder === -1) return 1;
    if (rightOrder === -1) return -1;
    return leftOrder - rightOrder;
  });
  const details = extras.filter(([key, value]) => key !== "tagline" && value.trim().length > 0);
  const pageUrl = `${siteUrl}/sites/${site.slug}`;
  const launched = site.launched ? formatDate(site.launched) : "Not listed";
  const tagline = site.extras?.tagline?.trim();
  const saved = Boolean(user?.saved.includes(site.slug));

  return (
    <>
      <SiteSeo
        title={site.name}
        description={`${site.description} Listed on ${siteName} — open ${domain}, see its details, and find similar sites.`}
        path={`/sites/${site.slug}`}
        keywords={[
          site.name,
          domain,
          ...site.tags,
          categoryLabel(site.category).toLowerCase(),
          "quiet websites",
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: site.name,
            url: site.url,
            description: site.description,
            inLanguage: "en",
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
              { "@type": "ListItem", position: 2, name: site.name, item: pageUrl },
            ],
          },
        ]}
      />

      <div className="site-detail-page">
        {/* The site itself is the backdrop: a live shot of the page, veiled so the
            name, blurb and actions stay readable on top of it. */}
        <section className="site-detail-hero" aria-labelledby="site-detail-title">
          <span
            className="site-detail-hero-shot"
            aria-hidden="true"
            style={{ backgroundImage: `url("${screenshotUrl(site.url, 1400, 900)}")` }}
          />
          <span className="site-detail-hero-veil" aria-hidden="true" />

          <div className="site-detail-hero-inner mx-auto w-full max-w-5xl px-4 sm:px-6">
            <div className="site-detail-identity">
              <SiteIcon site={site} size={64} label={false} />
              <div className="site-detail-title-block">
                <h1 id="site-detail-title">
                  {site.name}
                  {site.verified && <VerifiedStamp size={20} />}
                </h1>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-detail-domain"
                >
                  {domain} <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            {tagline && <p className="site-detail-tagline">{tagline}</p>}
            <p className="site-detail-lede">{site.description}</p>

            {site.tags.length > 0 && (
              <ul className="site-detail-tags" aria-label="Site tags">
                {site.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            )}

            <div className="site-detail-actions">
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn accent"
              >
                Visit {domain} <span aria-hidden="true">→</span>
              </a>
              <button
                type="button"
                className="btn ghost"
                aria-pressed={saved}
                title={saved ? "Remove from your saved list" : "Save this site"}
                onClick={() => (user ? void toggleSaved(site.slug) : askSignIn("save this site"))}
              >
                {saved ? "Saved ✓" : "Save site"}
              </button>
              <ReportProblem siteName={site.name} siteUrl={site.url} slug={site.slug} />
            </div>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-5 sm:px-6">
          <Link to="/" className="site-detail-back">
            <span aria-hidden="true">←</span> All {sites.length} sites
          </Link>

          <section className="site-detail-facts" aria-label="Listing facts">
            <div><span>Category</span><strong>{categoryLabel(site.category)}</strong></div>
            <div><span>Launched</span><strong>{launched}</strong></div>
            <div><span>Votes</span><strong>{vote.count}</strong></div>
            <div><span>Rank</span><strong>{rank > 0 ? `#${rank} of ${sites.length}` : "—"}</strong></div>
          </section>

          <section className="site-detail-section site-supporters-section" aria-labelledby="supporters-heading">
            <div className="site-detail-section-heading"><div><span className="site-detail-kicker">The people behind the signal</span><h2 id="supporters-heading">Supporters</h2></div><span className="site-supporters-count">{supporters.length}</span></div>
            {supporters.length > 0 ? <ul className="site-supporters-list">{supporters.map((supporter) => <li key={supporter.id}><Link to={`/users/${supporter.id}`} className="site-supporter"><img src={avatarUrl(supporter.avatarSeed)} alt="" width="34" height="34" loading="lazy" /><span>{supporter.name}</span></Link></li>)}</ul> : <p className="site-supporters-empty">Be the first person to support {site.name}.</p>}
          </section>

          {details.length > 0 && (
            <section className="site-detail-section">
              <h2>Details</h2>
              <dl className="site-detail-extra-grid">
                {details.map(([key, value]) => (
                  <div className="site-detail-extra" key={key}>
                    <dt>{humanizeKey(key)}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {lists.length > 0 && (
            <section className="site-detail-section">
              <h2>In collections</h2>
              <ul className="site-detail-collection-list">
                {lists.map((collection) => (
                  <li key={collection.id}>
                    <Link to={`/collections/${collection.id}`}>
                      <span>{collection.title}</span>
                      <span aria-hidden="true">↗</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {builderSites.length > 0 && (
            <section className="site-detail-section">
              <div className="site-detail-section-heading"><div><span className="site-detail-kicker">Keep exploring</span><h2>More from this builder</h2></div><span className="site-supporters-count">{builderSites.length}</span></div>
              <ul className="site-detail-related-grid">
                {builderSites.map((entry) => (
                  <li key={entry.id}>
                    <Link to={`/sites/${entry.slug}`} className="site-detail-related-card">
                      <SiteIcon site={entry} size={36} label={false} />
                      <span>
                        <strong>{entry.name}</strong>
                        <small>{siteDomain(entry.url)}</small>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* The last thing on the page: hand this listing to someone else. */}
          <section className="site-detail-section site-detail-share">
            <h2>Share this site</h2>
            <p>
              Send {site.name} to someone who would like it, or keep the link for later.
            </p>
            <ShareSite site={site} pageUrl={pageUrl} />
          </section>
        </div>
      </div>

      {/*
        Phones get the two things a visitor actually does here. It is portaled to
        <body> because the page's slide-in transition leaves an identity
        transform on the route pane, and a transform turns the pane into the
        containing block for `position: fixed` — the bar would sit at the bottom
        of the document instead of the bottom of the screen.
      */}
      {createPortal(
        <div className="site-detail-bar">
          <button
            type="button"
            className={`site-detail-bar-vote${vote.voted ? " is-voted" : ""}`}
            onClick={() => void voteAndRefreshSupporters()}
            disabled={vote.voted || vote.pending}
            aria-label={
              vote.voted
                ? `You voted for ${site.name}, ${vote.count} votes`
                : `Vote for ${site.name}, ${vote.count} votes`
            }
          >
            <span aria-hidden="true">{vote.voted ? "✓" : "▲"}</span>
            <span className="site-detail-bar-copy">
              <strong>{vote.pending ? "Counting…" : vote.voted ? "Voted" : "Vote"}</strong>
              <small>{vote.count} {vote.count === 1 ? "vote" : "votes"}</small>
            </span>
          </button>
          <a
            className="site-detail-bar-visit"
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit <span className="site-detail-bar-domain">{domain}</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>,
        document.body,
      )}
    </>
  );
}

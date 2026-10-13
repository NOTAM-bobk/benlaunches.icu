import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import { formatDate } from "../lib/posts";
import { siteName, siteUrl } from "../lib/siteData";
import { useDirectory } from "../lib/siteDirectory";
import { siteDomain } from "../lib/siteTile";

/**
 * Every listing shares this one page. Nothing here is written per site: the
 * sections below appear only when the record actually carries that field, so a
 * site submitted through the form and one written into config/sites.json both
 * get a full page the moment they are listed.
 */

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="detail-section">
      <div className="sec-head">
        <h2>{title}</h2>
        {note && <span className="detail-note">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function lines(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

export default function SiteDetail() {
  const { slug = "" } = useParams();
  const directory = useDirectory();
  const site = directory.siteBySlug(decodeURIComponent(slug));

  if (!site) {
    return (
      <>
        <SiteSeo title="Site not found" path={`/sites/${slug}`} noindex />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center gap-4 text-center">
          <span className="detail-flag">404</span>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">That site is not on the list</h1>
          <p className="max-w-md" style={{ color: "var(--muted)" }}>
            “{slug}” is not one of the {directory.sites.length} sites listed on {siteName}. It may
            have been renamed, or it may not be here yet.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/#all-sites" className="nav-cta">
              Browse the directory
            </Link>
            <Link to="/submit" className="btn ghost">
              Submit your site
            </Link>
          </div>
        </div>
      </>
    );
  }

  const domain = siteDomain(site.url);
  const category = directory.categoryLabel(site.category);
  const tags = lines(site.tags);
  const useCases = lines(site.useCases);
  const alternatives = lines(site.alternatives);
  const faq = site.faq ?? [];
  const rank = directory.rankOf(site);
  const inCollections = directory.collectionsForSite(site.slug);
  const related = directory.relatedSites(site, 4);
  const recentlyAdded = directory.newest(4).filter((entry) => entry.slug !== site.slug).slice(0, 3);

  const facts: Array<{ label: string; value: string }> = [
    { label: "Category", value: category },
    { label: "Domain", value: domain },
  ];
  if (site.launched) facts.push({ label: "Listed", value: formatDate(site.launched) });
  if (rank > 0) facts.push({ label: "Ranking", value: `#${rank} of ${directory.sites.length}` });
  if (site.pricing) facts.push({ label: "Pricing", value: site.pricing });
  facts.push({ label: "Access", value: site.openSource ? "Open source" : "Closed source" });
  facts.push({
    label: "Source",
    value: site.source === "submitted" ? "Submitted by its maker" : "Curated by hand",
  });

  const about = site.description;
  const lede = site.tagline && site.tagline !== about ? site.tagline : undefined;

  const pageUrl = `${siteUrl}/sites/${site.slug}`;

  return (
    <>
      <SiteSeo
        title={site.name}
        description={lede ?? about}
        path={`/sites/${site.slug}`}
        keywords={[...tags, category, site.name]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: site.name,
            url: site.url,
            description: about,
            inLanguage: "en",
            keywords: tags.join(", "),
            datePublished: site.launched,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
              {
                "@type": "ListItem",
                position: 2,
                name: category,
                item: `${siteUrl}/?category=${site.category}`,
              },
              { "@type": "ListItem", position: 3, name: site.name, item: pageUrl },
            ],
          },
        ]}
      />

      <article className="site-detail mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        <header className="detail-hero">
          <Link to="/#all-sites" className="detail-back">
            ← All {directory.sites.length} sites
          </Link>
          <div className="detail-head">
            <SiteIcon site={site} size={56} label={false} />
            <div className="min-w-0 flex flex-col gap-1">
              <span className="detail-kicker">
                {category}
                {site.launched && ` · ${formatDate(site.launched)}`}
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">{site.name}</h1>
              <span className="text-[12px] font-mono" style={{ color: "var(--muted)" }}>
                {domain}
              </span>
            </div>
          </div>

          <p className="detail-lede">{lede ?? about}</p>

          <div className="flex flex-wrap gap-3">
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn accent"
              title={`Open ${domain}`}
            >
              Visit {domain} <span aria-hidden="true">→</span>
            </a>
            <Link to={`/?category=${site.category}#explore`} className="btn ghost">
              More in {category}
            </Link>
          </div>

          {site.source === "submitted" && (
            <p className="detail-source">
              Sent in through the submit form
              {site.submittedAt ? ` and approved on ${formatDate(site.submittedAt.slice(0, 10))}` : ""}
              . Its own maker wrote the text below.
            </p>
          )}
        </header>

        <Section title="The details">
          <dl className="fact-grid">
            {facts.map((fact) => (
              <Fact key={fact.label} label={fact.label} value={fact.value} />
            ))}
          </dl>
        </Section>

        {lede && (
          <Section title="At a glance">
            <p className="detail-body">{about}</p>
          </Section>
        )}

        {useCases.length > 0 && (
          <Section title="Good for" note="what it is actually used for">
            <ul className="detail-list">
              {useCases.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        )}

        {alternatives.length > 0 && (
          <Section title="Alternatives worth knowing" note="listed here when we have them">
            <ul className="detail-list">
              {alternatives.map((item) => {
                const match = directory.sites.find(
                  (candidate) => candidate.name.toLowerCase() === item.toLowerCase(),
                );
                return (
                  <li key={item}>
                    {match ? (
                      <Link to={`/sites/${match.slug}`} className="accent-text font-bold underline underline-offset-4">
                        {item}
                      </Link>
                    ) : (
                      item
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {site.pricing && (
          <Section title="What it costs">
            <p className="detail-body">{site.pricing}</p>
          </Section>
        )}

        {faq.length > 0 && (
          <Section title="Questions" note={`${faq.length} answered`}>
            <div className="faq-list">
              {faq.map((item) => (
                <details key={item.question} className="faq-item">
                  <summary>{item.question}</summary>
                  {item.answer && <p className="detail-body">{item.answer}</p>}
                </details>
              ))}
            </div>
          </Section>
        )}

        {tags.length > 0 && (
          <Section title="Tags">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link key={tag} to={`/?q=${encodeURIComponent(tag)}#explore`} className="chip">
                  {tag}
                </Link>
              ))}
            </div>
          </Section>
        )}

        {inCollections.length > 0 && (
          <Section title="Appears in">
            <ul className="detail-list">
              {inCollections.map((collection) => (
                <li key={collection.id}>
                  <Link
                    to={`/collections/${collection.id}`}
                    className="accent-text font-bold underline underline-offset-4"
                  >
                    {collection.title}
                  </Link>
                  {collection.description && (
                    <span style={{ color: "var(--muted)" }}> — {collection.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {related.length > 0 && (
          <Section title={`More in ${category}`} note="picked from the same shelf">
            <ul className="detail-related">
              {related.map((entry) => (
                <li key={entry.id}>
                  <Link to={`/sites/${entry.slug}`} className="card card-link p-4 flex items-center gap-4">
                    <SiteIcon site={entry} size={36} label={false} />
                    <span className="min-w-0 flex flex-1 flex-col gap-0.5">
                      <span className="text-base font-bold truncate" style={{ color: "var(--ink)" }}>
                        {entry.name}
                      </span>
                      <span className="text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
                        {entry.tagline ?? entry.description}
                      </span>
                    </span>
                    <span className="detail-arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {recentlyAdded.length > 0 && (
          <Section title="Recently listed" note="the newest arrivals">
            <ul className="detail-list">
              {recentlyAdded.map((entry) => (
                <li key={entry.id}>
                  <Link
                    to={`/sites/${entry.slug}`}
                    className="font-bold accent-text underline underline-offset-4"
                  >
                    {entry.name}
                  </Link>
                  {entry.launched && (
                    <span className="text-[12px] font-mono" style={{ color: "var(--muted)" }}>
                      {" "}
                      · {formatDate(entry.launched)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <section className="cta-band">
          <div className="cta-copy">
            <span className="hero-eyebrow">
              <span className="hero-blip" aria-hidden="true" />
              Add another
            </span>
            <h2 className="text-2xl font-bold tracking-[-0.02em]">Know a site like this one?</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Send it in. Every entry on the list is read by hand, and the page above is written
              from what the form collects — nothing is hand-built per site.
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
      </article>
    </>
  );
}

import { Link, useParams } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import {
  collectionById,
  collectionSites,
  collections,
  siteUrl,
  siteName,
} from "../lib/siteData";
import { siteDomain } from "../lib/siteTile";

/** One collection: its name, its blurb, and every site in it as a link out. */
export default function CollectionDetail() {
  const { id = "" } = useParams();
  const collection = collectionById(id);
  const members = collection ? collectionSites(collection) : [];

  if (!collection) {
    return (
      <>
        <SiteSeo title="Collection not found" path={`/collections/${id}`} noindex />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center gap-4 text-center">
          <span
            className="text-[11px] font-bold tracking-[0.2em] uppercase border px-3 py-2"
            style={{ borderColor: "var(--ink)" }}
          >
            404
          </span>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">That collection is not here</h1>
          <p className="max-w-md" style={{ color: "var(--muted)" }}>
            “{id}” is not one of the {collections.length} collections on {siteName}.
          </p>
          <Link to="/collections" className="nav-cta">
            Browse all collections
          </Link>
        </div>
      </>
    );
  }

  const others = collections.filter((entry) => entry.id !== collection.id).slice(0, 3);
  const pageUrl = `${siteUrl}/collections/${collection.id}`;

  return (
    <>
      <SiteSeo
        title={collection.title}
        description={`${collection.description} ${members.length} sites, each linked straight out.`}
        path={`/collections/${collection.id}`}
        keywords={["collection", "curated sites", collection.title]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: collection.title,
            description: collection.description,
            url: pageUrl,
            inLanguage: "en",
            hasPart: members.map((site) => ({
              "@type": "WebSite",
              name: site.name,
              url: site.url,
              description: site.description,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
              {
                "@type": "ListItem",
                position: 2,
                name: "Collections",
                item: `${siteUrl}/collections`,
              },
              { "@type": "ListItem", position: 3, name: collection.title, item: pageUrl },
            ],
          },
        ]}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        <header className="flex flex-col gap-3 border-b pb-6" style={{ borderColor: "var(--rule)" }}>
          <Link
            to="/collections"
            className="text-[11px] font-bold tracking-[0.2em] uppercase accent-text"
          >
            ← All collections
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">
            {collection.title}
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            {collection.description}
          </p>
          <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
            {members.length} site{members.length === 1 ? "" : "s"} in this collection
          </span>
        </header>

        <ul className="flex flex-col gap-3">
          {members.map((site) => (
            <li key={site.id}>
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card card-link p-4 flex items-center gap-4"
              >
                <SiteIcon site={site} size={38} label={false} />
                <span className="min-w-0 flex flex-1 flex-col gap-0.5">
                  <span className="text-base font-bold truncate" style={{ color: "var(--ink)" }}>
                    {site.name}
                  </span>
                  <span className="text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
                    {site.description}
                  </span>
                  <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
                    {siteDomain(site.url)}
                  </span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] accent-text whitespace-nowrap">
                  Visit →
                </span>
              </a>
            </li>
          ))}
        </ul>

        {others.length > 0 && (
          <section className="space-y-3 border-t pt-6" style={{ borderColor: "var(--rule)" }}>
            <h2
              className="text-[11px] font-bold tracking-[0.2em] uppercase"
              style={{ color: "var(--ink)" }}
            >
              More collections
            </h2>
            <ul className="flex flex-col gap-2">
              {others.map((entry) => (
                <li key={entry.id}>
                  <Link
                    to={`/collections/${entry.id}`}
                    className="text-sm font-bold accent-text underline underline-offset-4"
                  >
                    {entry.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

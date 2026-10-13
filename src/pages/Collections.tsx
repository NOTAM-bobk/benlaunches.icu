import { Link } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import { collectionSites, collections, siteName, siteUrl } from "../lib/siteData";

/** Index of every curated collection, each linking to its own page. */
export default function Collections() {
  const grouped = collections.map((collection) => ({
    collection,
    members: collectionSites(collection),
  }));

  return (
    <>
      <SiteSeo
        title="Collections"
        description={`Hand-picked groups of sites from ${siteName} — ${collections.length} collections, each on its own page with every link.`}
        path="/collections"
        keywords={[
          "discover websites",
          "find websites",
          "website to website",
          "curated website collections",
          "new and upcoming websites",
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${siteName} collections`,
            description: `Curated collections to discover and find websites faster.`,
            url: `${siteUrl}/collections`,
            inLanguage: "en",
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${siteName} website collections`,
            url: `${siteUrl}/collections`,
            numberOfItems: grouped.length,
            itemListElement: grouped.map(({ collection, members }, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "CollectionPage",
                name: collection.title,
                url: `${siteUrl}/collections/${collection.id}`,
                description: `${collection.description} ${members.length} sites.`,
              },
            })),
          },
        ]}
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        <header className="flex flex-col gap-3 border-b pb-6" style={{ borderColor: "var(--rule)" }}>
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
            Collections
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">
            Sites grouped by <span className="accent-text">mood</span>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            Curated sets you can work through in one sitting. Open a collection for its own page,
            with every site listed and linked straight out.
          </p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Need the latest launches too? Visit{" "}
            <Link to="/new-websites" className="accent-text font-bold underline underline-offset-4">
              new and upcoming websites
            </Link>{" "}
            or jump into{" "}
            <Link to="/trending" className="accent-text font-bold underline underline-offset-4">
              trending discoveries
            </Link>
            .
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {grouped.map(({ collection, members }) => (
            <li key={collection.id}>
              <Link
                to={`/collections/${collection.id}`}
                className="card card-link p-5 sm:p-6 flex h-full flex-col gap-4"
              >
                <div className="tile-cluster">
                  {members.slice(0, 5).map((site) => (
                    <SiteIcon key={site.id} site={site} size={30} label={false} />
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold leading-snug">{collection.title}</h2>
                  <p className="text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>
                    {collection.description}
                  </p>
                </div>
                <span className="mt-auto text-[11px] font-mono" style={{ color: "var(--muted)" }}>
                  {members.length} sites · open the collection →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

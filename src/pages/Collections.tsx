import { useEffect, useState } from "react";
import { Link } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import { useAuth } from "../lib/auth";
import { collectionSites, collections, siteName, siteUrl } from "../lib/siteData";
import { collectionPath, listPublicCollections, type PublicCollection } from "../lib/userCollections";

/** Index of every curated collection, each linking to its own page. */
export default function Collections() {
  const { user } = useAuth();
  const [community, setCommunity] = useState<PublicCollection[]>([]);

  useEffect(() => {
    let active = true;
    void listPublicCollections(6).then((result) => {
      if (active && result.ok) setCommunity(result.value);
    });
    return () => {
      active = false;
    };
  }, []);

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
          <div className="hero-actions">
            <Link to="/collections/mine" className="btn accent">
              {user ? "Your collections" : "Build your own collection"}
            </Link>
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>
              Bookmark listings, group them, and share the link.
            </span>
          </div>
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

        {community.length > 0 && (
          <section className="space-y-4 border-t pt-8" style={{ borderColor: "var(--rule)" }}>
            <div>
              <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
                From the community
              </span>
              <h2 className="text-2xl font-bold">Fresh public collections</h2>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Built by visitors, readable by anyone with the link. Follow a curator to keep up with
                what they add next.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {community.map((collection) => (
                  <li key={collection.id}>
                    <Link to={collectionPath(collection)} className="card card-link ucol-tile">
                      <h3>{collection.title}</h3>
                      {collection.description && <p>{collection.description}</p>}
                      <span className="ucol-tile-meta">
                        {collection.curator ? `by ${collection.curator.name}` : "a visitor"} · {
                          collection.siteSlugs.length
                        }{" "}
                        site{collection.siteSlugs.length === 1 ? "" : "s"} · open →
                      </span>
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

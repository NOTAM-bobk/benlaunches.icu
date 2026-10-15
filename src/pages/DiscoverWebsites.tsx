import { Link, useSearchParams } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { SiteIcon } from "../components/SiteIcon";
import { discoverList as pickDiscoverList } from "../lib/discover";
import { categoryCount, categoryFilters, categoryLabel, siteName, siteUrl, trendingSites } from "../lib/siteData";
import { siteDomain } from "../lib/siteTile";

export default function DiscoverWebsites() {
  /* ?category=… keeps a filtered view a link somebody can send on. */
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "all";
  const discoverList = pickDiscoverList(category);
  const trending = trendingSites(6);

  return (
    <>
      <SiteSeo
        title="Discover websites"
        description={`Discover websites to jump website to website, find useful launches, and explore fresh links from ${siteName}.`}
        path="/discover-websites"
        keywords={[
          "discover websites",
          "find websites",
          "website to website",
          "bored button",
          "launched websites",
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `Discover websites on ${siteName}`,
            url: `${siteUrl}/discover-websites`,
            description: "A discovery-focused list of launched websites and direct links.",
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Discover websites list",
            url: `${siteUrl}/discover-websites`,
            numberOfItems: discoverList.length,
            itemListElement: discoverList.map((site, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: { "@type": "WebSite", name: site.name, url: site.url, description: site.description },
            })),
          },
        ]}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        <header className="flex flex-col gap-3 border-b pb-6" style={{ borderColor: "var(--rule)" }}>
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
            Discover websites
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">
            Jump <span className="accent-text">website to website</span>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            Use this as a calm bored button: open a site, learn something, then discover the next one.
            Every entry links out directly.
          </p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Also see{" "}
            <Link to="/new-websites" className="accent-text font-bold underline underline-offset-4">
              new and upcoming websites
            </Link>{" "}
            and the{" "}
            <Link to="/trending" className="accent-text font-bold underline underline-offset-4">
              trending list
            </Link>
            .
          </p>
        </header>

        <section className="space-y-4">
          {/* Filter the list by what the site is, not just how it ranks. */}
          <div className="discover-filters">
            <h2 className="text-xl font-bold">
              {category === "all" ? "Websites to discover now" : categoryLabel(category)}
            </h2>
            <div className="chip-row" role="group" aria-label="Filter discoveries by category">
              {categoryFilters
                .filter((entry) => entry.id === "all" || categoryCount(entry.id) > 0)
                .map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="chip"
                    aria-pressed={category === entry.id}
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      if (entry.id === "all") next.delete("category");
                      else next.set("category", entry.id);
                      setParams(next, { replace: true, preventScrollReset: true });
                    }}
                    style={{
                      backgroundColor: category === entry.id ? "var(--accent)" : "#ffffff",
                      color: category === entry.id ? "var(--on-accent)" : "var(--ink)",
                    }}
                  >
                    {entry.label}
                    <span className="chip-count">
                      {entry.id === "all" ? discoverList.length : categoryCount(entry.id)}
                    </span>
                  </button>
                ))}
            </div>
            <p className="discover-filters-note">
              {category === "all"
                ? `${discoverList.length} listed websites, ready to open.`
                : `Showing ${discoverList.length} of ${categoryCount(category)} in ${categoryLabel(category)}.`}
            </p>
          </div>

          {discoverList.length === 0 ? (
            <p
              className="border p-6 text-center text-sm"
              style={{ color: "var(--muted)", borderColor: "var(--ink)" }}
            >
              Nothing is filed under {categoryLabel(category)} yet. Try another category, or browse{" "}
              <Link to="/discover-websites" className="accent-text font-bold underline underline-offset-4">
                everything
              </Link>
              .
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {discoverList.map((site) => (
                <li key={site.id} className="card p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <SiteIcon site={site} size={30} />
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold hover:underline underline-offset-4"
                      style={{ color: "var(--ink)" }}
                    >
                      {site.name}
                    </a>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    {site.description}
                  </p>
                  <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
                    {siteDomain(site.url)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Trending discoveries</h2>
          <ul className="space-y-2">
            {trending.map((site) => (
              <li key={site.id}>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="accent-text font-bold underline underline-offset-4"
                >
                  {site.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

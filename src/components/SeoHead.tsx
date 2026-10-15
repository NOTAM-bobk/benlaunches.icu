import {
  siteAuthor,
  siteDescription,
  siteKeywords,
  siteName,
  siteTagline,
  siteUrl,
} from "../lib/siteData";

type JsonLd = Record<string, unknown>;

export interface SeoHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  /** Absolute path on the production domain, e.g. "/blog/hello". */
  path?: string;
  type?: "website" | "article";
  keywords?: string[];
  publishedTime?: string;
  noindex?: boolean;
  jsonLd?: JsonLd[];
}

function canonicalFor(path: string | undefined, fallback: string): string {
  if (path === undefined) return fallback;
  const cleanPath = path === "/" ? "/" : path.replace(/\/+$/, "");
  return `${siteUrl}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
}

export function SeoHead({
  title,
  description,
  canonical,
  path,
  type = "website",
  keywords,
  publishedTime,
  noindex,
  jsonLd,
}: SeoHeadProps) {
  const siteTitle = title ? `${title} — ${siteName}` : siteName;
  const pageDescription = description ?? siteDescription;
  const url = canonicalFor(path, canonical ?? `${siteUrl}/`);
  const image = `${siteUrl}/og.png`;
  // Keep this useful for older SEO panels and avoid repeating noisy keywords.
  const keywordList = [...new Set(keywords && keywords.length > 0 ? keywords : siteKeywords)]
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 8);

  return (
    <>
      <title>{siteTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      {keywordList.length > 0 && <meta name="keywords" content={keywordList.join(", ")} />}
      <meta
        name="robots"
        content={noindex ? "noindex, follow" : "index, follow, max-image-preview:large"}
      />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:alt" content={`${siteName} — ${siteTagline}`} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {publishedTime && <meta property="article:author" content={siteAuthor} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={`${siteName} — ${siteTagline}`} />
      <meta name="twitter:domain" content="www.benlaunches.icu" />

      <link rel="icon" href="/favicon.ico" sizes="32x32" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta name="theme-color" content="#1a120b" />

      {jsonLd?.map((block, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}

/** Convenience wrapper for a page inside the site. */
export function SiteSeo({
  title,
  description,
  path,
  keywords,
  jsonLd,
  noindex,
}: {
  title: string;
  description?: string;
  path: string;
  keywords?: string[];
  jsonLd?: JsonLd[];
  noindex?: boolean;
}) {
  return (
    <SeoHead
      title={title}
      description={description}
      path={path}
      keywords={keywords}
      jsonLd={jsonLd}
      noindex={noindex}
    />
  );
}

function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    alternateName: siteTagline,
    url: `${siteUrl}/`,
    description: siteDescription,
    inLanguage: "en",
    publisher: { "@type": "Organization", name: siteName, url: `${siteUrl}/` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

function itemListJsonLd({
  name,
  path,
  items,
}: {
  name: string;
  path: string;
  items: Array<{ name: string; url: string; description?: string }>;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: `${siteUrl}${path}`,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "WebSite",
        name: item.name,
        url: item.url,
        description: item.description,
      },
    })),
  };
}

export function HomepageSeo({
  featuredSites = [],
  newSites = [],
  trendingSites = [],
}: {
  featuredSites?: Array<{ name: string; url: string; description?: string }>;
  newSites?: Array<{ name: string; url: string; description?: string }>;
  trendingSites?: Array<{ name: string; url: string; description?: string }>;
}) {
  // The home page keeps the configured description verbatim: it is the line
  // search results show, so nothing is appended to it.
  const description = siteDescription;
  const keywords = [
    "bored button",
    "website to website",
    "discover websites",
    "find websites",
    "new and upcoming websites",
  ];
  const jsonLd: JsonLd[] = [websiteJsonLd()];

  if (featuredSites.length > 0) {
    jsonLd.push(
      itemListJsonLd({
        name: "Featured launched websites",
        path: "/",
        items: featuredSites,
      }),
    );
  }
  if (newSites.length > 0) {
    jsonLd.push(
      itemListJsonLd({
        name: "New and upcoming websites",
        path: "/",
        items: newSites,
      }),
    );
  }
  if (trendingSites.length > 0) {
    jsonLd.push(
      itemListJsonLd({
        name: "Trending discovered websites",
        path: "/trending",
        items: trendingSites,
      }),
    );
  }

  return (
    <SeoHead
      title={siteName}
      description={description}
      path="/"
      keywords={keywords}
      jsonLd={jsonLd}
    />
  );
}

export function BlogPostSeo({
  title,
  description,
  slug,
  date,
  author,
  tags,
  excerpt,
}: {
  title: string;
  description: string;
  slug: string;
  date: string;
  author: string;
  tags: string[];
  excerpt: string;
}) {
  const path = `/blog/${slug}`;
  const url = `${siteUrl}${path}`;

  return (
    <SeoHead
      title={title}
      description={description}
      path={path}
      type="article"
      keywords={tags}
      publishedTime={date ? `${date}T09:00:00Z` : undefined}
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: title,
          description: description || excerpt,
          url,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          datePublished: date,
          dateModified: date,
          inLanguage: "en",
          keywords: tags.join(", "),
          author: { "@type": "Organization", name: author },
          publisher: { "@type": "Organization", name: siteName, url: `${siteUrl}/` },
          image: `${siteUrl}/og.png`,
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
            { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
            { "@type": "ListItem", position: 3, name: title, item: url },
          ],
        },
      ]}
    />
  );
}

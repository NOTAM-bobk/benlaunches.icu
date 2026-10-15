/**
 * Writes public/sitemap.xml and public/robots.txt from the config folder.
 *
 *   bun scripts/generate-sitemap.mjs
 *
 * Run it after adding sites, posts, or collections so search engines see them.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(readFileSync(join(ROOT, "config", file), "utf8"));

const site = read("site.json");
const posts = read("blog.json").posts ?? [];
const sites = read("sites.json").sites ?? [];
const collections = read("explore.json").collections ?? [];
const base = String(site.url ?? "https://example.com").replace(/\/+$/, "");

/** Pages that always exist. */
const staticPages = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/discover-websites", priority: "0.9", changefreq: "daily" },
  { path: "/new-websites", priority: "0.9", changefreq: "daily" },
  { path: "/trending", priority: "0.9", changefreq: "daily" },
  { path: "/this-or-that", priority: "0.6", changefreq: "weekly" },
  { path: "/website-personality-quiz", priority: "0.6", changefreq: "weekly" },
  { path: "/blog", priority: "0.7", changefreq: "weekly" },
  { path: "/collections", priority: "0.8", changefreq: "weekly" },
  { path: "/submit", priority: "0.6", changefreq: "monthly" },
  { path: "/advertise", priority: "0.5", changefreq: "monthly" },
  { path: "/changelog", priority: "0.4", changefreq: "weekly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
];

/** Every listed site has its own page. */
/** Every placement and service has its own page. */
const servicePages = (read("services.json").items ?? []).map((entry) => ({
  path: `/services/${entry.id}`,
  priority: "0.4",
  changefreq: "monthly",
}));

const sitePages = sites.map((entry) => ({
  path: `/sites/${entry.slug}`,
  priority: "0.8",
  changefreq: "monthly",
}));

const postPages = posts.map((post) => ({
  path: `/blog/${post.slug}`,
  priority: "0.7",
  changefreq: "monthly",
  lastmod: post.date,
}));

const collectionPages = collections.map((collection) => ({
  path: `/collections/${collection.id}`,
  priority: "0.7",
  changefreq: "monthly",
}));

const urls = [...staticPages, ...servicePages, ...sitePages, ...collectionPages, ...postPages];
const today = new Date().toISOString().slice(0, 10);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${base}${url.path}</loc>
    <lastmod>${url.lastmod ?? today}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const robots = `# ${site.name}
User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /auth
Disallow: /auth/
Disallow: /checkout
Disallow: /embed
Disallow: /profile
Disallow: /saved
Disallow: /settings
Disallow: /stats
Disallow: /users
Disallow: /site-tinder

Sitemap: ${base}/sitemap.xml
`;

writeFileSync(join(ROOT, "public", "sitemap.xml"), xml);
writeFileSync(join(ROOT, "public", "robots.txt"), robots);
console.log(`sitemap: ${urls.length} urls written for ${base}`);

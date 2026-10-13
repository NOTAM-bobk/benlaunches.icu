import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const blogPath = path.join(repoRoot, "config", "blog.json");
const token = process.env.GITHUB_TOKEN;
const model = process.env.GITHUB_MODELS_MODEL || "openai/gpt-4.1-mini";

if (!token) {
  throw new Error("GITHUB_TOKEN is required.");
}

const today = new Date();
const date = today.toISOString().slice(0, 10);

const blog = JSON.parse(await readFile(blogPath, "utf8"));
if (!Array.isArray(blog.posts)) {
  throw new Error("config/blog.json must contain a posts array.");
}

if (blog.posts.some((post) => post?.date === date)) {
  console.log(`A post for ${date} already exists. Skipping generation.`);
  process.exit(0);
}

const recentTitles = blog.posts
  .slice(0, 8)
  .map((post) => `- ${String(post?.title || "Untitled")}`)
  .join("\n");

const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  },
  body: JSON.stringify({
    model,
    temperature: 0.8,
    max_tokens: 1400,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You write concise editorial blog posts about curated, launched websites. Return valid JSON only.",
      },
      {
        role: "user",
        content: [
          "Create exactly one SEO-optimized blog post object for a website directory blog.",
          "The output must be a JSON object with these keys:",
          "title (string), description (string <= 160 chars), excerpt (string <= 200 chars), tags (array of 3-5 short lowercase strings), blocks (array).",
          "blocks can only use: {type:'p',text}, {type:'h2',text}, {type:'quote',text}, {type:'ul',items:string[]}",
          "Use 7-10 blocks with a natural structure and practical advice.",
          "SEO requirements: clear search intent in title/description, include the main keyword phrase in the first paragraph naturally, avoid keyword stuffing.",
          "Do not include markdown, code fences, links, or extra keys.",
          "Keep the style plain, direct, and useful.",
          "Recent titles to avoid repeating:",
          recentTitles,
        ].join("\n"),
      },
    ],
  }),
});

if (!response.ok) {
  throw new Error(`Model request failed: ${response.status} ${await response.text()}`);
}

const payload = await response.json();
const rawContent = payload?.choices?.[0]?.message?.content;
if (typeof rawContent !== "string" || !rawContent.trim()) {
  throw new Error("Model returned empty content.");
}

function parseJson(input) {
  const trimmed = input.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(withoutFence);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cleanText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeBlocks(value) {
  if (!Array.isArray(value)) return [];
  const blocks = [];
  for (const raw of value) {
    const type = raw?.type;
    if (type === "ul") {
      const items = Array.isArray(raw?.items)
        ? raw.items.map((item) => cleanText(item)).filter(Boolean)
        : [];
      if (items.length > 0) blocks.push({ type: "ul", items });
      continue;
    }
    const text = cleanText(raw?.text);
    if (!text) continue;
    if (type === "h2") blocks.push({ type: "h2", text });
    else if (type === "quote") blocks.push({ type: "quote", text });
    else blocks.push({ type: "p", text });
  }
  return blocks;
}

const generated = parseJson(rawContent);
const title = cleanText(generated?.title, "Weekly web curation notes");
const description = cleanText(generated?.description, title).slice(0, 160);
const excerpt = cleanText(generated?.excerpt, description).slice(0, 200);
const blocks = normalizeBlocks(generated?.blocks);
const tags = Array.isArray(generated?.tags)
  ? generated.tags.map((tag) => cleanText(tag).toLowerCase()).filter(Boolean).slice(0, 5)
  : [];

if (blocks.length < 4) {
  throw new Error("Generated post has too few content blocks.");
}

let slug = slugify(title);
if (!slug) slug = `weekly-post-${date}`;
const used = new Set(blog.posts.map((post) => String(post?.slug || "")));
if (used.has(slug)) slug = `${slug}-${date}`;

const post = {
  slug,
  title,
  description,
  date,
  author: "Boring Internet",
  tags: tags.length > 0 ? tags : ["curation", "web", "weekly"],
  excerpt,
  blocks,
};

blog.posts.unshift(post);
await writeFile(blogPath, `${JSON.stringify(blog, null, 2)}\n`, "utf8");

console.log(`Added weekly post: ${slug}`);

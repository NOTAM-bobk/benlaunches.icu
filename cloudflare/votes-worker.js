/**
 * Cloudflare Worker for Boring Internet: trending votes, site submissions,
 * and the admin review queue. All state lives in Workers KV.
 *
 *   GET  /counts              -> { "site-slug": 12, ... }
 *   POST /vote                -> { slug, count }
 *   POST /unvote              -> { slug, count }
 *   POST /submit              -> { id, status }            (public, creates a pending submission)
 *   POST /admin/submissions   -> { submissions: [...] }     (requires ADMIN_PASSWORD)
 *   POST /admin/review        -> { id, status }             (requires ADMIN_PASSWORD)
 *   POST /admin/publish       -> { slug, commit, commitUrl } (requires ADMIN_PASSWORD)
 *        Formats a pending submission into a config/sites.json entry and commits
 *        it to the repository on the admin's behalf. Needs GITHUB_TOKEN.
 *   GET  /health              -> { ok: true, adminConfigured: bool, submissions: n }
 *
 * Secrets/vars (wrangler):
 *   ADMIN_PASSWORD   required for /admin/*  (wrangler secret put ADMIN_PASSWORD)
 *   GITHUB_TOKEN     repo write access for /admin/publish (wrangler secret put GITHUB_TOKEN)
 *   ALLOWED_ORIGIN   comma-separated list of allowed browser origins (defaults to "*")
 *   GITHUB_REPO      "owner/name" to commit into (set in wrangler.toml [vars])
 *   GITHUB_BRANCH    branch to commit to (defaults to "main")
 *   GITHUB_SITES_PATH  directory file to edit (defaults to "config/sites.json")
 *   VOTES            KV namespace binding
 */

const GITHUB_API = "https://api.github.com";

const VOTE_PREFIX = "vote:";
const MONTHLY_VOTE_PREFIX = "monthly-vote:";
const SUBMISSION_PREFIX = "submission:";
const REPORT_PREFIX = "report:";
const PURCHASE_PREFIX = "purchase:";
const USER_PREFIX = "user:";
const EMAIL_PREFIX = "email:";
const SESSION_PREFIX = "session:";
const SESSION_COOKIE = "bi_session";
const ANALYTICS_PREFIX = "analytics:";
const STREAK_PREFIX = "streak:";
const SESSION_DAYS = 30;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_BODY_BYTES = 24 * 1024;
const REVIEW_STATUSES = new Set(["pending", "approved", "rejected"]);
const PURCHASE_STATUSES = new Set(["pending", "fulfilled", "refunded"]);

function cors(env, request) {
  // Trailing slashes are stripped: a browser's Origin header never has one, so
  // a list entry like "https://example.org/" would never match anything.
  const allowed = (env.ALLOWED_ORIGIN || "*")
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  const requested = request.headers.get("Origin");
  const origin = requested && allowed.includes(requested) ? requested : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body, headers, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function readBody(request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function str(value, max) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hashPassword(password, salt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16)))) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 120000, hash: "SHA-256" }, key, 256);
  return { salt, hash: bytesToBase64(new Uint8Array(bits)) };
}

async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(bytes));
}

function userKey(id) { return USER_PREFIX + id; }
function emailKey(email) { return EMAIL_PREFIX + email.toLowerCase().trim(); }
function sessionKey(token) { return SESSION_PREFIX + token; }
function streakKey(userId) { return STREAK_PREFIX + userId; }
function analyticsDay(date = new Date()) { return date.toISOString().slice(0, 10); }
function analyticsPath(path) {
  const value = str(path, 160);
  return value.startsWith("/") ? value.replace(/[^a-zA-Z0-9_?&=./:-]/g, "") || "/" : "/";
}
async function increment(env, key) {
  const next = (Number(await env.VOTES.get(key)) || 0) + 1;
  await env.VOTES.put(key, String(next), { expirationTtl: 60 * 60 * 24 * 45 });
  return next;
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.get("Cookie") || "").split(";").map((part) => part.trim().split("=")).filter(([key, value]) => key && value));
}

function cookieHeader(token, maxAge = SESSION_DAYS * 86400) {
  return `${SESSION_COOKIE}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=None`;
}

function withCookie(response, cookie) {
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", cookie);
  return new Response(response.body, { status: response.status, headers });
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, avatarSeed: user.avatarSeed, bio: user.bio, settings: user.settings, saved: user.saved || [], voted: user.voted || [] };
}

async function currentUser(request, env) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const session = await env.VOTES.get(sessionKey(token), "json");
  if (!session || session.expiresAt < Date.now()) return null;
  return env.VOTES.get(userKey(session.userId), "json");
}

const requireUser = currentUser;

async function createSession(userId, env) {
  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  await env.VOTES.put(sessionKey(token), JSON.stringify({ userId, expiresAt: Date.now() + SESSION_DAYS * 86400000 }), { expirationTtl: SESSION_DAYS * 86400 });
  return token;
}

function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

function decodeHtml(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function htmlField(html, pattern, max) {
  const match = html.match(pattern);
  return match ? decodeHtml(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, max) : "";
}

async function inspectSite(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("unsupported protocol");
  } catch {
    return { error: "Enter a valid http:// or https:// URL." };
  }

  try {
    const response = await fetch(parsed.toString(), {
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "BoringInternet-Autofill/1.0" },
      redirect: "follow",
    });
    if (!response.ok) return { error: `The site returned HTTP ${response.status}.` };
    const html = (await response.text()).slice(0, 300000);
    const title = htmlField(html, /<title[^>]*>([\s\S]*?)<\/title>/i, 120);
    const description = htmlField(
      html,
      /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
      4000,
    );
    const reverseDescription = htmlField(
      html,
      /<meta[^>]+content=["']([\s\S]*?)["'][^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/i,
      4000,
    );
    const firstParagraph = htmlField(html, /<p[^>]*>([\s\S]*?)<\/p>/i, 4000);
    const h1 = htmlField(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i, 160);
    const fullDescription = description || reverseDescription || firstParagraph || h1 || title;
    const tagline = (description || reverseDescription || h1 || title).split(/[.!?]\s/)[0].slice(0, 160);
    const frameBlocked = /x-frame-options|frame-ancestors\s+[^;]*(?:'none'|'self')/i.test(
      `${response.headers.get("x-frame-options") || ""} ${response.headers.get("content-security-policy") || ""}`,
    );
    return { url: response.url || parsed.toString(), name: title || h1, tagline, description: fullDescription, supportsIframe: !frameBlocked };
  } catch {
    return { error: "Could not fetch that site. Check the URL and try again." };
  }
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function adminConfigured(env) {
  return typeof env.ADMIN_PASSWORD === "string" && env.ADMIN_PASSWORD.length > 0;
}

/* ---------------- publishing an approved submission ---------------- */

/** UTF-8 text as base64, the shape the GitHub contents API expects. */
function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Base64 back to UTF-8 text (GitHub wraps long values with newlines). */
function fromBase64(value) {
  const binary = atob(String(value).replace(/\s+/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

/** "Two Cranes!" -> "two-cranes" — the same shape config/sites.json uses. */
function slugFrom(value, fallback = "site") {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

/** A slug nobody has taken yet: "name", then "name-2", "name-3", … */
function freshSlug(base, taken) {
  if (!taken.has(base)) return base;
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${base.slice(0, 36)}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, 30)}-${Date.now().toString(36)}`;
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * A submission dressed as a config/sites.json entry. The card blurb is the
 * tagline; the long answers ride along as `extras`, which the site page prints
 * under "Details" without a code change.
 */
function entryFromSubmission(submission, slug) {
  const category = submission.categories[0] || "uncategorized";
  const description = (submission.tagline || submission.description || submission.name).trim().slice(0, 200);
  const entry = {
    id: slug,
    name: submission.name,
    slug,
    url: submission.url,
    description,
    category,
    tags: submission.categories,
    verified: true,
    launched: isIsoDate(submission.launchDate) ? submission.launchDate : new Date().toISOString().slice(0, 10),
  };
  const extras = {
    about: submission.description,
    targetAudience: submission.targetAudience,
    problem: submission.problem,
    features: submission.features,
    useCases: submission.useCases,
    alternatives: submission.alternatives,
    pricing: submission.pricing,
    socialLinks: submission.socialLinks,
    faq: submission.faq,
  };
  for (const [key, value] of Object.entries(extras)) {
    const text = String(value || "").trim();
    if (text) entry[key] = text;
  }
  if (submission.openSource === true) entry.openSource = "Yes";
  return entry;
}

/**
 * Appends the submission to the directory file and commits it through the
 * GitHub contents API. The token never reaches the browser — this runs here.
 */
async function publishToDirectory(env, submission) {
  const token = env.GITHUB_TOKEN;
  const repo = env.GITHUB_REPO;
  if (typeof token !== "string" || !token || typeof repo !== "string" || !repo) {
    return { error: "GitHub publishing is not configured on this worker.", status: 503 };
  }
  const branch = env.GITHUB_BRANCH || "main";
  const path = env.GITHUB_SITES_PATH || "config/sites.json";
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ben-launches-admin",
  };

  let file;
  try {
    const current = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`, { headers });
    if (current.status === 404) return { error: `Could not find ${path} on ${branch}.`, status: 404 };
    if (!current.ok) return { error: `GitHub could not read ${path} (HTTP ${current.status}).`, status: 502 };
    file = await current.json();
  } catch {
    return { error: "Could not reach GitHub.", status: 502 };
  }

  let data;
  try {
    data = JSON.parse(fromBase64(file.content || ""));
  } catch {
    return { error: `${path} is not valid JSON, so it was left alone.`, status: 502 };
  }
  if (!Array.isArray(data?.sites)) {
    return { error: `${path} does not hold a "sites" list, so it was left alone.`, status: 502 };
  }

  const taken = new Set(data.sites.map((site) => site?.slug).filter(Boolean));
  let host = "";
  try {
    host = new URL(submission.url).hostname.replace(/^www\./, "");
  } catch {
    /* the submission validator already rejected bad URLs */
  }
  const slug = freshSlug(slugFrom(submission.name, slugFrom(host)), taken);
  data.sites.push(entryFromSubmission(submission, slug));

  let result;
  try {
    const put = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Add ${submission.name} to the directory`,
        content: toBase64(`${JSON.stringify(data, null, 2)}\n`),
        sha: file.sha,
        branch,
      }),
    });
    if (!put.ok) return { error: `GitHub rejected the commit (HTTP ${put.status}).`, status: 502 };
    result = await put.json();
  } catch {
    return { error: "The commit could not be sent to GitHub.", status: 502 };
  }

  return { slug, commit: result?.commit?.sha || "", commitUrl: result?.commit?.html_url || "", path };
}

async function isAdmin(body, env) {
  if (!adminConfigured(env)) return false;
  return constantTimeEqual(str(body?.password, 200), env.ADMIN_PASSWORD);
}

/* ---------------- votes ---------------- */

function voteKey(slug) {
  return VOTE_PREFIX + slug;
}

async function voteCount(env, slug) {
  return Number((await env.VOTES.get(voteKey(slug))) ?? 0) || 0;
}

async function allVoteCounts(env) {
  const counts = {};
  let cursor;
  do {
    const page = await env.VOTES.list({ prefix: VOTE_PREFIX, cursor, limit: 1000 });
    for (const key of page.keys) {
      counts[key.name.slice(VOTE_PREFIX.length)] =
        Number(key.metadata?.count ?? (await voteCount(env, key.name.slice(VOTE_PREFIX.length)))) || 0;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return counts;
}

function isVoteMonth(value) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function currentVoteMonth() {
  return new Date().toISOString().slice(0, 7);
}

async function monthlyVoteCounts(env, month) {
  const counts = {};
  const prefix = `${MONTHLY_VOTE_PREFIX}${month}:`;
  let cursor;
  do {
    const page = await env.VOTES.list({ prefix, cursor, limit: 1000 });
    for (const key of page.keys) {
      const slug = key.name.slice(prefix.length);
      counts[slug] = Number(key.metadata?.count ?? (await env.VOTES.get(key.name))) || 0;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return counts;
}

async function monthlyVoteMonths(env) {
  const months = new Set([currentVoteMonth()]);
  let cursor;
  do {
    const page = await env.VOTES.list({ prefix: MONTHLY_VOTE_PREFIX, cursor, limit: 1000 });
    for (const key of page.keys) {
      const month = key.name.slice(MONTHLY_VOTE_PREFIX.length).split(":", 1)[0];
      if (isVoteMonth(month)) months.add(month);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return [...months].sort((a, b) => b.localeCompare(a));
}

/* ---------------- submissions ---------------- */

const CATEGORY_LIMIT = 8;

function validateSubmission(body) {
  const errors = [];
  const name = str(body.name, 80);
  const url = str(body.url, 300);
  const tagline = str(body.tagline, 160);
  const description = str(body.description, 4000);
  const launchDate = str(body.launchDate, 20);
  const targetAudience = str(body.targetAudience, 2000);
  const problem = str(body.problem, 3000);
  const features = str(body.features, 3000);
  const useCases = str(body.useCases, 2000);
  const alternatives = str(body.alternatives, 2000);
  const pricing = str(body.pricing, 1000);
  const socialLinks = str(body.socialLinks, 2000);
  const faq = str(body.faq, 4000);
  const categories = Array.isArray(body.categories)
    ? [...new Set(body.categories.map((c) => str(c, 40)).filter(Boolean))].slice(0, CATEGORY_LIMIT)
    : [];

  if (name.length < 2) errors.push("name");
  if (tagline.length < 4) errors.push("tagline");
  if (description.length < 20) errors.push("description");
  if (categories.length === 0) errors.push("categories");

  let parsedUrl = null;
  try {
    parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") errors.push("url");
  } catch {
    errors.push("url");
  }

  return {
    errors,
    value: {
      name,
      url,
      tagline,
      description,
      launchDate,
      targetAudience,
      problem,
      features,
      useCases,
      alternatives,
      pricing,
      socialLinks,
      faq,
      categories,
      openSource: body.openSource === true,
      supportsIframe: body.supportsIframe === true,
    },
  };
}

async function listSubmissions(env) {
  const submissions = [];
  let cursor;
  do {
    const page = await env.VOTES.list({ prefix: SUBMISSION_PREFIX, cursor, limit: 1000 });
    for (const key of page.keys) {
      const raw = await env.VOTES.get(key.name);
      if (!raw) continue;
      try {
        submissions.push(JSON.parse(raw));
      } catch {
        /* skip corrupt entries */
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return submissions.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
}

async function listPurchases(env) {
  const purchases = [];
  let cursor;
  do {
    const page = await env.VOTES.list({ prefix: PURCHASE_PREFIX, cursor, limit: 1000 });
    for (const key of page.keys) {
      const purchase = await env.VOTES.get(key.name, "json");
      if (purchase) purchases.push(purchase);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return purchases.sort((a, b) => String(b.paidAt ?? b.recordedAt ?? "").localeCompare(String(a.paidAt ?? a.recordedAt ?? "")));
}

async function profileSubmissions(env, ownerId, includePending) {
  const all = await listSubmissions(env);
  return all.filter((submission) => submission.ownerId === ownerId && (includePending || submission.status === "approved"))
    .map(({ id, name, url, tagline, status, createdAt }) => ({ id, name, url, tagline, status, createdAt }));
}

async function analyticsStats(env) {
  const days = [];
  const now = new Date();
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - offset);
    const day = analyticsDay(date);
    days.push({ date: day, views: Number(await env.VOTES.get(`${ANALYTICS_PREFIX}day:${day}:views`)) || 0, uniqueViews: Number(await env.VOTES.get(`${ANALYTICS_PREFIX}day:${day}:unique`)) || 0 });
  }
  const pageCounts = {};
  let cursor;
  do {
    const page = await env.VOTES.list({ prefix: `${ANALYTICS_PREFIX}page:`, cursor, limit: 1000 });
    for (const key of page.keys) pageCounts[key.name.slice(`${ANALYTICS_PREFIX}page:`.length)] = Number(await env.VOTES.get(key.name)) || 0;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return {
    generatedAt: new Date().toISOString(),
    totals: { views: days.reduce((sum, day) => sum + day.views, 0), uniqueViews: days.reduce((sum, day) => sum + day.uniqueViews, 0) },
    days,
    topPages: Object.entries(pageCounts).sort(([, a], [, b]) => b - a).slice(0, 10).map(([path, views]) => ({ path, views })),
  };
}

/* ---------------- handlers ---------------- */

export default {
  async fetch(request, env) {
    const headers = cors(env, request);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    const { pathname } = new URL(request.url);

    if (pathname === "/health" && request.method === "GET") {
      return json(
        {
          ok: true,
          adminConfigured: adminConfigured(env),
          publishing: Boolean(env.GITHUB_TOKEN && env.GITHUB_REPO),
          submissions: (await env.VOTES.list({ prefix: SUBMISSION_PREFIX, limit: 1000 })).keys.length,
          purchases: (await env.VOTES.list({ prefix: PURCHASE_PREFIX, limit: 1000 })).keys.length,
        },
        headers,
      );
    }

    if (pathname === "/counts" && request.method === "GET") {
      return json(await allVoteCounts(env), headers);
    }

    if (pathname === "/monthly-months" && request.method === "GET") {
      return json({ months: await monthlyVoteMonths(env) }, headers);
    }

    if (pathname === "/monthly-counts" && request.method === "GET") {
      const month = new URL(request.url).searchParams.get("month") || currentVoteMonth();
      if (!isVoteMonth(month)) return json({ error: "invalid month" }, headers, 400);
      return json(await monthlyVoteCounts(env, month), headers);
    }

    if (pathname === "/analytics/view" && request.method === "POST") {
      const body = await readBody(request);
      const day = analyticsDay();
      const path = analyticsPath(body?.path);
      const visitor = str(body?.visitorId, 120);
      await increment(env, `${ANALYTICS_PREFIX}day:${day}:views`);
      await increment(env, `${ANALYTICS_PREFIX}page:${path}`);
      if (visitor) {
        const uniqueKey = `${ANALYTICS_PREFIX}unique:${day}:${await digest(visitor)}`;
        if (!(await env.VOTES.get(uniqueKey))) {
          await env.VOTES.put(uniqueKey, "1", { expirationTtl: 60 * 60 * 24 * 45 });
          await increment(env, `${ANALYTICS_PREFIX}day:${day}:unique`);
        }
      }
      return json({ ok: true }, headers, 202);
    }

    if (pathname === "/analytics/stats" && request.method === "GET") {
      return json(await analyticsStats(env), headers);
    }

    const profileMatch = pathname.match(/^\/profiles\/([^/]+)\/submissions$/);
    if (profileMatch && request.method === "GET") {
      const profileId = str(decodeURIComponent(profileMatch[1]), 100);
      const includePending = new URL(request.url).searchParams.get("private") === "1";
      return json({ submissions: await profileSubmissions(env, profileId, includePending) }, headers);
    }

    if (pathname === "/inspect" && request.method === "GET") {
      const target = new URL(request.url).searchParams.get("url") || "";
      const result = await inspectSite(target);
      return result.error ? json(result, headers, 400) : json(result, headers);
    }

    if (pathname === "/auth/signup" && request.method === "POST") {
      const body = await readBody(request);
      const email = str(body?.email, 160).toLowerCase();
      const password = typeof body?.password === "string" ? body.password : "";
      const name = str(body?.name, 80);
      if (!validEmail(email) || password.length < 8 || name.length < 2) return json({ error: "Use a valid email, a name, and a password with at least 8 characters." }, headers, 400);
      if (await env.VOTES.get(await digest(emailKey(email)))) return json({ error: "An account with that email already exists." }, headers, 409);
      const id = crypto.randomUUID();
      const passwordData = await hashPassword(password);
      const user = { id, email, name, avatarSeed: id.slice(0, 8), bio: "", password: passwordData, settings: { emailUpdates: false, reducedMotion: false }, saved: [], voted: [], createdAt: new Date().toISOString() };
      await env.VOTES.put(userKey(id), JSON.stringify(user));
      await env.VOTES.put(await digest(emailKey(email)), id);
      const token = await createSession(id, env);
      return withCookie(json({ user: publicUser(user) }, headers, 201), cookieHeader(token));
    }

    if (pathname === "/auth/signin" && request.method === "POST") {
      const body = await readBody(request);
      const email = str(body?.email, 160).toLowerCase();
      const password = typeof body?.password === "string" ? body.password : "";
      const id = await env.VOTES.get(await digest(emailKey(email)));
      const user = id ? await env.VOTES.get(userKey(id), "json") : null;
      const candidate = user?.password ? await hashPassword(password, user.password.salt) : null;
      if (!user || !candidate || candidate.hash !== user.password.hash) return json({ error: "Email or password is incorrect." }, headers, 401);
      const token = await createSession(user.id, env);
      return withCookie(json({ user: publicUser(user) }, headers), cookieHeader(token));
    }

    if (pathname === "/auth/me" && request.method === "GET") {
      const user = await currentUser(request, env);
      return user ? json({ user: publicUser(user) }, headers) : json({ error: "Not signed in." }, headers, 401);
    }

    if (pathname === "/auth/streak" && request.method === "POST") {
      const body = await readBody(request);
      const userId = str(body?.userId, 100);
      if (!userId) return json({ error: "A user ID is required." }, headers, 400);
      const today = analyticsDay();
      const key = streakKey(userId);
      const previous = await env.VOTES.get(key, "json") || { current: 0, longest: 0, lastDate: "" };
      if (previous.lastDate === today) return json({ streak: previous }, headers);
      const yesterday = new Date(`${today}T00:00:00.000Z`);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const current = previous.lastDate === analyticsDay(yesterday) ? Number(previous.current) + 1 : 1;
      const streak = { current, longest: Math.max(Number(previous.longest) || 0, current), lastDate: today };
      await env.VOTES.put(key, JSON.stringify(streak));
      return json({ streak }, headers);
    }

    if (pathname === "/auth/signout" && request.method === "POST") {
      const token = parseCookies(request)[SESSION_COOKIE];
      if (token) await env.VOTES.delete(sessionKey(token));
      return withCookie(json({ ok: true }, headers), cookieHeader("", 0));
    }

    if (pathname === "/auth/profile" && request.method === "POST") {
      const user = await requireUser(request, env);
      if (!user) return json({ error: "Sign in to edit your profile." }, headers, 401);
      const body = await readBody(request);
      user.name = str(body?.name, 80) || user.name;
      user.avatarSeed = str(body?.avatarSeed, 80) || user.avatarSeed;
      user.bio = str(body?.bio, 240);
      await env.VOTES.put(userKey(user.id), JSON.stringify(user));
      return json({ user: publicUser(user) }, headers);
    }

    if (pathname === "/auth/settings" && request.method === "POST") {
      const user = await requireUser(request, env);
      if (!user) return json({ error: "Sign in to edit settings." }, headers, 401);
      const body = await readBody(request);
      user.settings = { emailUpdates: body?.emailUpdates === true, reducedMotion: body?.reducedMotion === true };
      await env.VOTES.put(userKey(user.id), JSON.stringify(user));
      return json({ user: publicUser(user) }, headers);
    }

    if (pathname === "/auth/saved" && request.method === "POST") {
      const user = await requireUser(request, env);
      if (!user) return json({ error: "Sign in to save websites." }, headers, 401);
      const slug = str((await readBody(request))?.slug, 64).toLowerCase();
      if (!SLUG_RE.test(slug)) return json({ error: "Invalid website." }, headers, 400);
      user.saved = user.saved || [];
      user.saved = user.saved.includes(slug) ? user.saved.filter((item) => item !== slug) : [...user.saved, slug].slice(-200);
      await env.VOTES.put(userKey(user.id), JSON.stringify(user));
      return json({ user: publicUser(user) }, headers);
    }

    if ((pathname === "/vote" || pathname === "/unvote") && request.method === "POST") {
      const body = await readBody(request);
      const slug = str(body?.slug, 64).toLowerCase();
      if (!SLUG_RE.test(slug)) return json({ error: "invalid slug" }, headers, 400);

      const current = await voteCount(env, slug);
      const next = pathname === "/vote" ? current + 1 : Math.max(0, current - 1);
      await env.VOTES.put(voteKey(slug), String(next), {
        metadata: { count: next, updatedAt: Date.now() },
      });
      if (pathname === "/vote") {
        const month = currentVoteMonth();
        const monthlyKey = `${MONTHLY_VOTE_PREFIX}${month}:${slug}`;
        const monthlyCount = (Number(await env.VOTES.get(monthlyKey)) || 0) + 1;
        await env.VOTES.put(monthlyKey, String(monthlyCount), {
          metadata: { count: monthlyCount, updatedAt: Date.now() },
        });
      }
      const user = await currentUser(request, env);
      if (user) {
        user.voted = user.voted || [];
        if (pathname === "/vote" && !user.voted.includes(slug)) user.voted = [...user.voted, slug].slice(-500);
        if (pathname === "/unvote") user.voted = user.voted.filter((item) => item !== slug);
        await env.VOTES.put(userKey(user.id), JSON.stringify(user));
      }
      return json({ slug, count: next }, headers);
    }

    if (pathname === "/submit" && request.method === "POST") {
      const body = await readBody(request);
      if (!body) return json({ error: "invalid body" }, headers, 400);

      const { errors, value } = validateSubmission(body);
      if (errors.length > 0) {
        return json({ error: "invalid fields", fields: errors }, headers, 400);
      }

      const id = crypto.randomUUID();
      const submission = {
        id,
        status: "pending",
        createdAt: new Date().toISOString(),
        ownerId: str(body.ownerId, 100),
        ...value,
      };
      await env.VOTES.put(SUBMISSION_PREFIX + id, JSON.stringify(submission));
      return json({ id, status: submission.status }, headers, 201);
    }

    if (pathname === "/report" && request.method === "POST") {
      const body = await readBody(request);
      const slug = str(body?.slug, 64).toLowerCase();
      const siteName = str(body?.siteName, 120);
      const siteUrl = str(body?.siteUrl, 300);
      const issue = str(body?.issue, 2000);
      const type = ["problem", "iframe", "other"].includes(body?.type) ? body.type : "problem";
      const email = str(body?.email, 160);
      if (!SLUG_RE.test(slug) || siteName.length < 2 || !/^https?:\/\//i.test(siteUrl) || issue.length < 8) {
        return json({ error: "Tell us which site has a problem and describe the issue in at least 8 characters." }, headers, 400);
      }
      const id = crypto.randomUUID();
      const report = { id, slug, siteName, siteUrl, type, issue, email, status: "pending", createdAt: new Date().toISOString() };
      await env.VOTES.put(REPORT_PREFIX + id, JSON.stringify(report));
      return json({ id, status: report.status }, headers, 201);
    }

    if (pathname === "/payments/record" && request.method === "POST") {
      const body = await readBody(request);
      if (!body || !(await isAdmin(body, env))) return json({ error: "wrong password" }, headers, 401);
      const purchase = body.purchase;
      const orderId = str(purchase?.orderId, 80);
      if (!orderId || purchase?.status !== "COMPLETED") return json({ error: "invalid purchase" }, headers, 400);
      const record = {
        status: "pending",
        ...purchase,
        orderId,
        recordedAt: str(purchase.recordedAt, 40) || new Date().toISOString(),
      };
      await env.VOTES.put(PURCHASE_PREFIX + orderId, JSON.stringify(record));
      return json({ ok: true, orderId }, headers);
    }

    if ((pathname === "/admin/reports" || pathname === "/admin/report-review") && request.method === "POST") {
      const body = await readBody(request);
      if (!body) return json({ error: "invalid body" }, headers, 400);
      if (!adminConfigured(env)) return json({ error: "admin is not configured on this worker" }, headers, 503);
      if (!(await isAdmin(body, env))) return json({ error: "wrong password" }, headers, 401);
      if (pathname === "/admin/reports") {
        const reports = [];
        let cursor;
        do {
          const page = await env.VOTES.list({ prefix: REPORT_PREFIX, cursor, limit: 1000 });
          for (const key of page.keys) {
            const raw = await env.VOTES.get(key.name, "json");
            if (raw) reports.push(raw);
          }
          cursor = page.list_complete ? undefined : page.cursor;
        } while (cursor);
        reports.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
        return json({ reports }, headers);
      }
      const id = str(body.id, 80);
      const status = str(body.status, 20);
      if (!REVIEW_STATUSES.has(status)) return json({ error: "invalid review" }, headers, 400);
      const raw = await env.VOTES.get(REPORT_PREFIX + id);
      if (!raw) return json({ error: "not found" }, headers, 404);
      await env.VOTES.put(REPORT_PREFIX + id, JSON.stringify({ ...JSON.parse(raw), status, reviewedAt: new Date().toISOString() }));
      return json({ id, status }, headers);
    }

    if ((pathname === "/admin/purchases" || pathname === "/admin/purchase-review") && request.method === "POST") {
      const body = await readBody(request);
      if (!body || !(await isAdmin(body, env))) return json({ error: "wrong password" }, headers, 401);
      if (pathname === "/admin/purchases") return json({ purchases: await listPurchases(env) }, headers);
      const orderId = str(body.orderId, 80);
      const status = str(body.status, 20);
      if (!orderId || !PURCHASE_STATUSES.has(status)) return json({ error: "invalid purchase review" }, headers, 400);
      const existing = await env.VOTES.get(PURCHASE_PREFIX + orderId, "json");
      if (!existing) return json({ error: "not found" }, headers, 404);
      await env.VOTES.put(PURCHASE_PREFIX + orderId, JSON.stringify({ ...existing, status, reviewedAt: new Date().toISOString() }));
      return json({ orderId, status }, headers);
    }

    if (pathname === "/admin/publish" && request.method === "POST") {
      const body = await readBody(request);
      if (!body) return json({ error: "invalid body" }, headers, 400);
      if (!adminConfigured(env)) {
        return json({ error: "admin is not configured on this worker" }, headers, 503);
      }
      if (!(await isAdmin(body, env))) {
        return json({ error: "wrong password" }, headers, 401);
      }
      const id = str(body.id, 80);
      if (!SLUG_RE.test(id)) return json({ error: "invalid submission" }, headers, 400);
      const raw = await env.VOTES.get(SUBMISSION_PREFIX + id);
      if (!raw) return json({ error: "not found" }, headers, 404);
      const submission = JSON.parse(raw);
      if (submission.publishedSlug) {
        return json({ error: "That submission is already in the directory." }, headers, 409);
      }

      const published = await publishToDirectory(env, submission);
      if (published.error) {
        return json({ error: published.error }, headers, published.status || 502);
      }

      const now = new Date().toISOString();
      const updated = {
        ...submission,
        status: "approved",
        reviewedAt: now,
        publishedAt: now,
        publishedSlug: published.slug,
        publishedCommit: published.commit,
      };
      await env.VOTES.put(SUBMISSION_PREFIX + id, JSON.stringify(updated));
      return json(
        { ok: true, id, status: updated.status, slug: published.slug, commit: published.commit, commitUrl: published.commitUrl, path: published.path },
        headers,
        201,
      );
    }

    if ((pathname === "/admin/submissions" || pathname === "/admin/review") && request.method === "POST") {
      const body = await readBody(request);
      if (!body) return json({ error: "invalid body" }, headers, 400);
      if (!adminConfigured(env)) {
        return json({ error: "admin is not configured on this worker" }, headers, 503);
      }
      if (!(await isAdmin(body, env))) {
        return json({ error: "wrong password" }, headers, 401);
      }

      if (pathname === "/admin/submissions") {
        return json({ submissions: await listSubmissions(env) }, headers);
      }

      const id = str(body.id, 80);
      const status = str(body.status, 20);
      if (!SLUG_RE.test(id) || !REVIEW_STATUSES.has(status)) {
        return json({ error: "invalid review" }, headers, 400);
      }
      const raw = await env.VOTES.get(SUBMISSION_PREFIX + id);
      if (!raw) return json({ error: "not found" }, headers, 404);

      const updated = { ...JSON.parse(raw), status, reviewedAt: new Date().toISOString() };
      await env.VOTES.put(SUBMISSION_PREFIX + id, JSON.stringify(updated));
      return json({ id, status }, headers);
    }

    return json({ error: "not found" }, headers, 404);
  },
};

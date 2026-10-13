/**
 * Cloudflare Worker for Boring Internet: trending votes, site submissions,
 * and the admin review queue. All state lives in Workers KV.
 *
 *   GET  /counts              -> { "site-slug": 12, ... }
 *   POST /vote                -> { slug, count }
 *   POST /unvote              -> { slug, count }
 *   POST /submit              -> { id, status }            (public, creates a pending submission)
 *   GET  /sites               -> { sites: [...] }          (public, approved submissions only)
 *   POST /admin/submissions   -> { submissions: [...] }     (requires ADMIN_PASSWORD)
 *   POST /admin/review        -> { id, status }             (requires ADMIN_PASSWORD)
 *   GET  /health              -> { ok: true, adminConfigured: bool, submissions: n }
 *
 * Secrets/vars (wrangler):
 *   ADMIN_PASSWORD   required for /admin/*  (wrangler secret put ADMIN_PASSWORD)
 *   ALLOWED_ORIGIN   CORS origin for the browser (defaults to "*")
 *   VOTES            KV namespace binding
 */

const VOTE_PREFIX = "vote:";
const SUBMISSION_PREFIX = "submission:";
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_BODY_BYTES = 24 * 1024;
const REVIEW_STATUSES = new Set(["pending", "approved", "rejected"]);

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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

/* ---------------- submissions ---------------- */

const CATEGORY_LIMIT = 8;

function validateSubmission(body) {
  const errors = [];
  const name = str(body.name, 80);
  const url = str(body.url, 300);
  const tagline = str(body.tagline, 160);
  const description = str(body.description, 4000);
  const useCases = str(body.useCases, 2000);
  const alternatives = str(body.alternatives, 2000);
  const pricing = str(body.pricing, 1000);
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
      useCases,
      alternatives,
      pricing,
      faq,
      categories,
      openSource: body.openSource === true,
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

/**
 * The public shape of an approved submission: exactly the fields the directory
 * and the generated detail page render. Nothing admin-only leaks through here.
 */
function publicSite(submission) {
  return {
    id: submission.id,
    name: submission.name,
    url: submission.url,
    tagline: submission.tagline ?? "",
    description: submission.description ?? "",
    useCases: submission.useCases ?? "",
    alternatives: submission.alternatives ?? "",
    pricing: submission.pricing ?? "",
    faq: submission.faq ?? "",
    categories: Array.isArray(submission.categories) ? submission.categories : [],
    openSource: submission.openSource === true,
    status: "approved",
    createdAt: submission.createdAt ?? "",
    reviewedAt: submission.reviewedAt ?? submission.createdAt ?? "",
  };
}

/* ---------------- handlers ---------------- */

export default {
  async fetch(request, env) {
    const headers = cors(env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    const { pathname } = new URL(request.url);

    if (pathname === "/health" && request.method === "GET") {
      return json(
        {
          ok: true,
          adminConfigured: adminConfigured(env),
          submissions: (await env.VOTES.list({ prefix: SUBMISSION_PREFIX, limit: 1000 })).keys.length,
        },
        headers,
      );
    }

    if (pathname === "/counts" && request.method === "GET") {
      return json(await allVoteCounts(env), headers);
    }

    // Public: the approved half of the review queue, so the site can list and
    // describe them without a redeploy.
    if (pathname === "/sites" && (request.method === "GET" || request.method === "POST")) {
      const approved = (await listSubmissions(env))
        .filter((submission) => submission.status === "approved")
        .map(publicSite);
      return json({ sites: approved }, headers);
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
        ...value,
      };
      await env.VOTES.put(SUBMISSION_PREFIX + id, JSON.stringify(submission));
      return json({ id, status: submission.status }, headers, 201);
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

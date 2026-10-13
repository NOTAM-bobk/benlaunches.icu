import { votesConnected, votesEndpoint } from "./votes";

/**
 * Site submissions go to the same Worker as votes (`cloudflare/votes-worker.js`).
 * The admin queue is password protected and the password is checked on the
 * Worker, never in the browser bundle.
 */
export const submissionsConnected = votesConnected;

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface SubmissionDraft {
  name: string;
  url: string;
  tagline: string;
  description: string;
  useCases: string;
  alternatives: string;
  pricing: string;
  faq: string;
  categories: string[];
  openSource: boolean;
}

export interface Submission extends SubmissionDraft {
  id: string;
  status: SubmissionStatus;
  createdAt: string;
  reviewedAt?: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string; fields?: string[] };

async function post<T>(path: string, payload: unknown): Promise<Result<T>> {
  if (!submissionsConnected) {
    return { ok: false, error: "The submissions service is not connected." };
  }
  try {
    const res = await fetch(`${votesEndpoint}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const fields = data && Array.isArray(data.fields)
        ? data.fields.filter((field): field is string => typeof field === "string")
        : undefined;
      return {
        ok: false,
        error:
          typeof data?.error === "string" ? data.error : `The service returned ${res.status}.`,
        fields,
      };
    }
    return { ok: true, value: data as T };
  } catch {
    return { ok: false, error: "Could not reach the submissions service." };
  }
}

export async function submitSite(
  draft: SubmissionDraft,
): Promise<Result<{ id: string; status: SubmissionStatus }>> {
  return post<{ id: string; status: SubmissionStatus }>("/submit", draft);
}

export async function fetchSubmissions(
  password: string,
): Promise<Result<{ submissions: Submission[] }>> {
  return post<{ submissions: Submission[] }>("/admin/submissions", { password });
}

export async function reviewSubmission(
  password: string,
  id: string,
  status: SubmissionStatus,
): Promise<Result<{ id: string; status: SubmissionStatus }>> {
  return post<{ id: string; status: SubmissionStatus }>("/admin/review", { password, id, status });
}

/** Everything a submission needs to become a directory entry. */
function looksLikeSubmission(value: unknown): value is Submission {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Submission>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.url === "string"
  );
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Fills in the fields the public endpoint may leave out. */
function normalizeSubmission(submission: Submission): Submission {
  return {
    id: submission.id,
    name: submission.name,
    url: submission.url,
    tagline: text(submission.tagline),
    description: text(submission.description),
    useCases: text(submission.useCases),
    alternatives: text(submission.alternatives),
    pricing: text(submission.pricing),
    faq: text(submission.faq),
    categories: Array.isArray(submission.categories)
      ? submission.categories.filter((category): category is string => typeof category === "string")
      : [],
    openSource: submission.openSource === true,
    status: "approved",
    createdAt: text(submission.createdAt),
    reviewedAt: text(submission.reviewedAt) || text(submission.createdAt),
  };
}

/**
 * Approved submissions, published by the Worker so the browser can build
 * directory entries and detail pages from them without a rebuild. Returns an
 * empty list whenever the Worker is missing or unreachable, so the site falls
 * back to the config files.
 */
export async function fetchApprovedSites(): Promise<Submission[]> {
  if (!submissionsConnected) return [];
  try {
    const res = await fetch(`${votesEndpoint}/sites`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json().catch(() => null)) as { sites?: unknown } | null;
    if (!Array.isArray(data?.sites)) return [];
    return data.sites.filter(looksLikeSubmission).map(normalizeSubmission);
  } catch {
    return [];
  }
}

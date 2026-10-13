import { votesConnected, votesEndpoint } from "./votes";
import { fetchProfileSubmissions, type ProfileSubmission } from "./submitted";

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
  launchDate: string;
  targetAudience: string;
  problem: string;
  features: string;
  useCases: string;
  alternatives: string;
  pricing: string;
  socialLinks: string;
  faq: string;
  categories: string[];
  openSource: boolean;
  supportsIframe: boolean;
}

export interface Submission extends SubmissionDraft {
  id: string;
  status: SubmissionStatus;
  createdAt: string;
  reviewedAt?: string;
}

export type SiteProblemReportType = "problem" | "iframe" | "other";

export interface SiteProblemReportDraft {
  slug: string;
  siteName: string;
  siteUrl: string;
  type: SiteProblemReportType;
  issue: string;
  email: string;
}

export interface SiteProblemReport extends SiteProblemReportDraft {
  id: string;
  status: SubmissionStatus;
  createdAt: string;
  reviewedAt?: string;
}

export type PurchaseStatus = "pending" | "fulfilled" | "refunded";
export interface Purchase {
  status: PurchaseStatus;
  orderId: string;
  captureId: string;
  paidAt: string;
  recordedAt: string;
  reviewedAt?: string;
  currency: string;
  total: string;
  payer: { name: string; email: string };
  items: { name: string; quantity: number; unitAmount: string }[];
  amountMatchesItems: boolean;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string; fields?: string[] };

export interface SiteAutofill {
  url: string;
  name: string;
  tagline: string;
  description: string;
  supportsIframe: boolean;
}

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

export async function autofillSite(url: string): Promise<Result<SiteAutofill>> {
  if (!submissionsConnected) return { ok: false, error: "The submissions service is not connected." };
  try {
    const res = await fetch(`${votesEndpoint}/inspect?url=${encodeURIComponent(url)}`);
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      return {
        ok: false,
        error: typeof data?.error === "string" ? data.error : `The service returned ${res.status}.`,
      };
    }
    return { ok: true, value: data as unknown as SiteAutofill };
  } catch {
    return { ok: false, error: "Could not inspect that URL." };
  }
}

export async function submitSite(
  draft: SubmissionDraft,
  ownerId?: string,
): Promise<Result<{ id: string; status: SubmissionStatus }>> {
  return post<{ id: string; status: SubmissionStatus }>("/submit", { ...draft, ownerId });
}

export { fetchProfileSubmissions, type ProfileSubmission };

export async function submitSiteReport(
  report: SiteProblemReportDraft,
): Promise<Result<{ id: string; status: SubmissionStatus }>> {
  return post<{ id: string; status: SubmissionStatus }>("/report", report);
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

export async function fetchSiteReports(
  password: string,
): Promise<Result<{ reports: SiteProblemReport[] }>> {
  return post<{ reports: SiteProblemReport[] }>("/admin/reports", { password });
}

export async function reviewSiteReport(
  password: string,
  id: string,
  status: SubmissionStatus,
): Promise<Result<{ id: string; status: SubmissionStatus }>> {
  return post<{ id: string; status: SubmissionStatus }>("/admin/report-review", { password, id, status });
}

export async function fetchPurchases(password: string): Promise<Result<{ purchases: Purchase[] }>> {
  return post<{ purchases: Purchase[] }>("/admin/purchases", { password });
}

export async function reviewPurchase(
  password: string,
  orderId: string,
  status: PurchaseStatus,
): Promise<Result<{ orderId: string; status: PurchaseStatus }>> {
  return post<{ orderId: string; status: PurchaseStatus }>("/admin/purchase-review", { password, orderId, status });
}

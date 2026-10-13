import { useEffect, useState, type FormEvent } from "react";
import { SiteSeo } from "../components/SeoHead";
import {
  fetchSubmissions,
  fetchSiteReports,
  fetchPurchases,
  reviewSubmission,
  reviewSiteReport,
  reviewPurchase,
  submissionsConnected,
  type SiteProblemReport,
  type Submission,
  type SubmissionStatus,
  type Purchase,
  type PurchaseStatus,
} from "../lib/submissions";

const FILTERS: Array<{ id: SubmissionStatus | "all"; label: string }> = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

function StatusChip({ status }: { status: SubmissionStatus }) {
  const tone =
    status === "approved"
      ? { backgroundColor: "var(--ink)", color: "var(--surface)" }
      : status === "rejected"
        ? { backgroundColor: "transparent", color: "var(--muted)" }
        : { backgroundColor: "var(--accent)", color: "var(--on-accent)" };
  return (
    <span
      className="text-[10px] font-bold tracking-[0.14em] uppercase border px-2 py-0.5"
      style={{ ...tone, borderColor: "var(--ink)" }}
    >
      {status}
    </span>
  );
}

function SubmissionCard({
  submission,
  onReview,
  busy,
}: {
  submission: Submission;
  onReview: (id: string, status: SubmissionStatus) => void;
  busy: boolean;
}) {
  const rows: Array<[string, string]> = [
    ["Tagline", submission.tagline],
    ["Description", submission.description],
    ["Launch date", submission.launchDate],
    ["Who it is for", submission.targetAudience],
    ["Problem solved", submission.problem],
    ["Key features", submission.features],
    ["Use cases", submission.useCases],
    ["Alternatives", submission.alternatives],
    ["Pricing", submission.pricing],
    ["Social or community links", submission.socialLinks],
    ["FAQ", submission.faq],
  ].filter(([, value]) => typeof value === "string" && value.length > 0) as Array<[string, string]>;

  return (
    <article className="card p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{submission.name}</h2>
            <StatusChip status={submission.status} />
            {submission.openSource && (
              <span className="text-[10px] font-mono border px-2 py-0.5" style={{ borderColor: "var(--rule)", color: "var(--muted)" }}>
                open source
              </span>
            )}
            {submission.supportsIframe && (
              <span className="text-[10px] font-mono border px-2 py-0.5" style={{ borderColor: "var(--rule)", color: "var(--muted)" }}>
                iframe ready
              </span>
            )}
          </div>
          <a
            href={submission.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-mono accent-text underline underline-offset-4 break-all"
          >
            {submission.url}
          </a>
        </div>
        <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
          {new Date(submission.createdAt).toLocaleString("en-US")}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {submission.categories.map((category) => (
          <span
            key={category}
            className="text-[11px] font-mono border px-2 py-0.5"
            style={{ borderColor: "var(--rule)", color: "var(--muted)" }}
          >
            {category}
          </span>
        ))}
      </div>

      <dl className="flex flex-col gap-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: "var(--muted)" }}>
              {label}
            </dt>
            <dd className="text-[14px] leading-relaxed whitespace-pre-line">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4" style={{ borderColor: "var(--rule)" }}>
        <button
          type="button"
          className="btn"
          disabled={busy || submission.status === "approved"}
          onClick={() => onReview(submission.id, "approved")}
        >
          Approve
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={busy || submission.status === "rejected"}
          onClick={() => onReview(submission.id, "rejected")}
        >
          Reject
        </button>
        <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
          {submission.id}
        </span>
      </div>
    </article>
  );
}

function ReportCard({
  report,
  onReview,
  busy,
}: {
  report: SiteProblemReport;
  onReview: (id: string, status: SubmissionStatus) => void;
  busy: boolean;
}) {
  return (
    <article className="card p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{report.siteName}</h2>
            <StatusChip status={report.status} />
          </div>
          <a href={report.siteUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] font-mono accent-text underline underline-offset-4 break-all">
            {report.siteUrl}
          </a>
        </div>
        <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>
          {new Date(report.createdAt).toLocaleString("en-US")}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase border px-2 py-0.5" style={{ borderColor: "var(--rule)", color: "var(--muted)" }}>
          {report.type === "iframe" ? "iframe report" : report.type}
        </span>
        {report.email && <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>{report.email}</span>}
      </div>
      <p className="text-[15px] leading-relaxed whitespace-pre-line">{report.issue}</p>
      <div className="flex flex-wrap items-center gap-3 border-t pt-4" style={{ borderColor: "var(--rule)" }}>
        <button type="button" className="btn" disabled={busy || report.status === "approved"} onClick={() => onReview(report.id, "approved")}>Mark fixed</button>
        <button type="button" className="btn ghost" disabled={busy || report.status === "rejected"} onClick={() => onReview(report.id, "rejected")}>Dismiss</button>
        <span className="text-[11px] font-mono" style={{ color: "var(--muted)" }}>{report.id}</span>
      </div>
    </article>
  );
}

function PurchaseCard({ purchase, busy, onReview }: { purchase: Purchase; busy: boolean; onReview: (orderId: string, status: PurchaseStatus) => void }) {
  return (
    <article className="card p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{purchase.payer.name || "PayPal buyer"}</h2>
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase border px-2 py-0.5" style={{ borderColor: "var(--ink)", backgroundColor: purchase.status === "fulfilled" ? "var(--ink)" : "var(--accent)", color: purchase.status === "fulfilled" ? "var(--surface)" : "var(--on-accent)" }}>{purchase.status}</span>
          </div>
          <a className="accent-text underline break-all" href={`mailto:${purchase.payer.email}`}>{purchase.payer.email || "No email returned by PayPal"}</a>
        </div>
        <strong className="text-xl">{purchase.total} {purchase.currency}</strong>
      </div>
      <ul className="flex flex-col gap-1 text-[14px]">
        {purchase.items.map((item, index) => <li key={`${item.name}-${index}`}><strong>{item.quantity}×</strong> {item.name} <span style={{ color: "var(--muted)" }}>({item.unitAmount} each)</span></li>)}
      </ul>
      <div className="flex flex-wrap gap-3 text-[11px] font-mono" style={{ color: "var(--muted)" }}>
        <span>Paid {new Date(purchase.paidAt || purchase.recordedAt).toLocaleString("en-US")}</span>
        <span>Order {purchase.orderId}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t pt-4" style={{ borderColor: "var(--rule)" }}>
        <button type="button" className="btn" disabled={busy || purchase.status === "fulfilled"} onClick={() => onReview(purchase.orderId, "fulfilled")}>Mark fulfilled</button>
        <button type="button" className="btn ghost" disabled={busy || purchase.status === "refunded"} onClick={() => onReview(purchase.orderId, "refunded")}>Mark refunded</button>
        {purchase.amountMatchesItems ? <span className="text-[11px]" style={{ color: "var(--muted)" }}>PayPal amount matches services</span> : <span className="text-[11px]" style={{ color: "var(--accent)" }}>Check amount against services</span>}
      </div>
    </article>
  );
}

export default function Admin() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reports, setReports] = useState<SiteProblemReport[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filter, setFilter] = useState<SubmissionStatus | "all">("pending");

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const [result, reportResult, purchaseResult] = await Promise.all([fetchSubmissions(password), fetchSiteReports(password), fetchPurchases(password)]);
    setBusy(false);
    if (!result.ok) {
      setError(result.error === "wrong password" ? "Wrong password." : result.error);
      return;
    }
    setSubmissions(result.value.submissions);
    if (reportResult.ok) setReports(reportResult.value.reports);
    if (purchaseResult.ok) setPurchases(purchaseResult.value.purchases);
    setUnlocked(true);
  }

  // KV reads can lag a write by up to a minute, so poll while unlocked.
  useEffect(() => {
    if (!unlocked) return;
    let active = true;
    const timer = setInterval(() => {
      void Promise.all([fetchSubmissions(password), fetchSiteReports(password), fetchPurchases(password)]).then(([submissionResult, reportResult, purchaseResult]) => {
        if (!active) return;
        if (submissionResult.ok) setSubmissions(submissionResult.value.submissions);
        if (reportResult.ok) setReports(reportResult.value.reports);
        if (purchaseResult.ok) setPurchases(purchaseResult.value.purchases);
      });
    }, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [unlocked, password]);

  async function refresh(currentPassword: string) {
    const [result, reportResult, purchaseResult] = await Promise.all([fetchSubmissions(currentPassword), fetchSiteReports(currentPassword), fetchPurchases(currentPassword)]);
    if (result.ok) setSubmissions(result.value.submissions);
    if (reportResult.ok) setReports(reportResult.value.reports);
    if (purchaseResult.ok) setPurchases(purchaseResult.value.purchases);
  }

  async function review(id: string, status: SubmissionStatus) {
    setBusy(true);
    const result = await reviewSubmission(password, id, status);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSubmissions((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }

  async function reviewReport(id: string, status: SubmissionStatus) {
    setBusy(true);
    const result = await reviewSiteReport(password, id, status);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReports((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  async function reviewPayment(orderId: string, status: PurchaseStatus) {
    setBusy(true);
    const result = await reviewPurchase(password, orderId, status);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPurchases((current) => current.map((purchase) => purchase.orderId === orderId ? { ...purchase, status } : purchase));
  }

  const visible =
    filter === "all" ? submissions : submissions.filter((item) => item.status === filter);
  const pendingCount = submissions.filter((item) => item.status === "pending").length;

  return (
    <>
      <SiteSeo
        title="Admin"
        description="Review submitted sites."
        path="/admin"
        noindex
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        <header className="flex flex-col gap-3 border-b pb-6" style={{ borderColor: "var(--rule)" }}>
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">Admin</span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">Submitted sites</h1>
          <p className="text-base" style={{ color: "var(--muted)" }}>
            Password is checked on the Worker, never in this page. Submissions live in Workers KV.
          </p>
        </header>

        {!unlocked ? (
          <form className="card p-5 sm:p-6 flex flex-col gap-4" onSubmit={unlock}>
            <label htmlFor="admin-password" className="text-[12px] font-bold tracking-[0.12em] uppercase">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
              placeholder="••••"
              style={{ borderColor: "var(--ink)" }}
            />
            {!submissionsConnected && (
              <p className="text-[13px]" style={{ color: "var(--accent)" }}>
                The Worker is not connected, so there is nothing to load yet.
              </p>
            )}
            {error && (
              <p className="text-[13px]" style={{ color: "var(--accent)" }}>
                {error}
              </p>
            )}
            <button type="submit" className="btn" disabled={busy || !submissionsConnected}>
              {busy ? "Checking…" : "Unlock review queue"}
            </button>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFilter(option.id)}
                    className="border px-3 py-1.5 text-[13px] font-bold transition-colors hover:bg-[#1a120b] hover:text-[#fff7ee]"
                    style={{
                      borderColor: "var(--ink)",
                      backgroundColor: filter === option.id ? "var(--accent)" : "#ffffff",
                      color: filter === option.id ? "var(--on-accent)" : "var(--ink)",
                    }}
                  >
                    {option.label}
                    {option.id === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="pager"
                  onClick={() => void refresh(password)}
                  title="Refresh"
                  aria-label="Refresh submissions"
                >
                  ↻
                </button>
                <button
                  type="button"
                  className="text-[12px] font-bold uppercase tracking-[0.12em] accent-text"
                  onClick={() => {
                    setUnlocked(false);
                    setPassword("");
                    setSubmissions([]);
                    setReports([]);
                    setPurchases([]);
                  }}
                >
                  Lock
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[13px]" style={{ color: "var(--accent)" }}>
                {error}
              </p>
            )}

            {visible.length === 0 ? (
              <p className="border p-8 text-center text-sm" style={{ borderColor: "var(--rule)", color: "var(--muted)" }}>
                Nothing here yet. New submissions land in Pending.
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                {visible.map((submission) => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    busy={busy}
                    onReview={(id, status) => void review(id, status)}
                  />
                ))}
              </div>
            )}

            <section className="flex flex-col gap-5 border-t pt-8" style={{ borderColor: "var(--rule)" }}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">Payments</span>
                  <h2 className="text-2xl font-bold">Purchases {purchases.length > 0 ? `(${purchases.filter((purchase) => purchase.status === "pending").length} to fulfill)` : ""}</h2>
                </div>
                <p className="text-[12px]" style={{ color: "var(--muted)" }}>PayPal buyers and the service they purchased.</p>
              </div>
              {purchases.length === 0 ? <p className="border p-6 text-center text-sm" style={{ borderColor: "var(--rule)", color: "var(--muted)" }}>No completed purchases recorded yet.</p> : <div className="flex flex-col gap-5">{purchases.map((purchase) => <PurchaseCard key={purchase.orderId} purchase={purchase} busy={busy} onReview={(orderId, status) => void reviewPayment(orderId, status)} />)}</div>}
            </section>

            <section className="flex flex-col gap-5 border-t pt-8" style={{ borderColor: "var(--rule)" }}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">Site feedback</span>
                  <h2 className="text-2xl font-bold">Problem reports {reports.length > 0 ? `(${reports.filter((report) => report.status === "pending").length} pending)` : ""}</h2>
                </div>
                <p className="text-[12px]" style={{ color: "var(--muted)" }}>Reports from detail pages and This-or-That.</p>
              </div>
              {reports.length === 0 ? (
                <p className="border p-6 text-center text-sm" style={{ borderColor: "var(--rule)", color: "var(--muted)" }}>No site-problem reports yet.</p>
              ) : (
                <div className="flex flex-col gap-5">
                  {reports.map((report) => (
                    <ReportCard key={report.id} report={report} busy={busy} onReview={(id, status) => void reviewReport(id, status)} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

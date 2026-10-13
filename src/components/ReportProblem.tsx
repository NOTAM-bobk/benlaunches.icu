import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { submitSiteReport, type SiteProblemReportType } from "../lib/submissions";

interface ReportProblemProps {
  siteName: string;
  siteUrl: string;
  slug: string;
  initialType?: SiteProblemReportType;
  triggerLabel?: string;
  compact?: boolean;
}

export function ReportProblem({
  siteName,
  siteUrl,
  slug,
  initialType = "problem",
  triggerLabel = "Report a problem",
  compact = false,
}: ReportProblemProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<SiteProblemReportType>(initialType);
  const [issue, setIssue] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function openForm() {
    setType(initialType);
    setMessage(null);
    setOpen(true);
  }

  function closeForm() {
    if (!busy) setOpen(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await submitSiteReport({ slug, siteName, siteUrl, type, issue, email });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage("Thanks — the report was sent to the review queue.");
    setIssue("");
    setEmail("");
  }

  return (
    <>
      <button type="button" className={compact ? "text-[11px] font-bold uppercase tracking-[0.1em] accent-text underline underline-offset-4" : "btn ghost"} onClick={openForm}>
        {triggerLabel}
      </button>

      {/* Portaled to <body>: the page pane carries a transform from its slide-in
          transition, and a transformed ancestor becomes the containing block for
          `position: fixed`, which pinned the dialog to the page instead. */}
      {open && createPortal(
        <div className="report-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <section className="report-dialog card" role="dialog" aria-modal="true" aria-labelledby={`report-title-${slug}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="accent-text text-[11px] font-bold tracking-[0.18em] uppercase">Site feedback</span>
                <h2 id={`report-title-${slug}`} className="text-2xl font-bold">Report a problem</h2>
              </div>
              <button type="button" className="pager" onClick={closeForm} aria-label="Close report form">×</button>
            </div>

            <form className="flex flex-col gap-4" onSubmit={submit}>
              <div className="report-readonly">
                <span className="report-readonly-label">Website</span>
                <strong>{siteName}</strong>
                <span className="text-[12px] font-mono break-all" style={{ color: "var(--muted)" }}>{siteUrl}</span>
              </div>

              <label className="flex flex-col gap-2">
                <span className="field-label">Report type</span>
                <select className="field" value={type} onChange={(event) => setType(event.target.value as SiteProblemReportType)}>
                  <option value="problem">Something is wrong with this listing</option>
                  <option value="iframe">This site does not allow iframe previews</option>
                  <option value="other">Other issue</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="field-label">What is the problem?</span>
                <textarea className="field min-h-32" required minLength={8} maxLength={2000} value={issue} onChange={(event) => setIssue(event.target.value)} placeholder="Tell us what should be fixed…" />
              </label>

              <label className="flex flex-col gap-2">
                <span className="field-label">Your email <span className="font-normal normal-case tracking-normal" style={{ color: "var(--muted)" }}>(optional)</span></span>
                <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Only if you want a reply" />
              </label>

              {message && <p className="text-[13px]" style={{ color: message.startsWith("Thanks") ? "var(--ink)" : "var(--accent)" }}>{message}</p>}

              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" className="btn ghost" onClick={closeForm} disabled={busy}>Cancel</button>
                <button type="submit" className="btn accent" disabled={busy}>{busy ? "Sending…" : "Send report"}</button>
              </div>
            </form>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { BoostTraffic } from "../components/BoostTraffic";
import { VoteGate, VOTES_REQUIRED } from "../components/VoteGate";
import { categoryChoices, siteName, siteUrl } from "../lib/siteData";
import { readVotedSlugs } from "../lib/votes";
import { autofillSite, submissionsConnected, submitSite, type SubmissionDraft } from "../lib/submissions";

type TextFieldKey =
  | "url"
  | "name"
  | "tagline"
  | "description"
  | "launchDate"
  | "targetAudience"
  | "problem"
  | "features"
  | "useCases"
  | "alternatives"
  | "pricing"
  | "socialLinks"
  | "faq";

const EMPTY_DRAFT: SubmissionDraft = {
  name: "",
  url: "",
  tagline: "",
  description: "",
  launchDate: "",
  targetAudience: "",
  problem: "",
  features: "",
  useCases: "",
  alternatives: "",
  pricing: "",
  socialLinks: "",
  faq: "",
  categories: [],
  openSource: false,
  supportsIframe: false,
};

const FIELDS: Array<{
  key: TextFieldKey;
  label: string;
  placeholder?: string;
  hint?: string;
  rows?: number;
  required?: boolean;
}> = [
  { key: "url", label: "URL", placeholder: "https://your-site.com", required: true },
  { key: "name", label: "Product name", placeholder: "My new site", required: true },
  {
    key: "tagline",
    label: "One line tagline",
    hint: "one sentence, no full stop needed",
    placeholder: "A quiet list of launched sites",
    required: true,
  },
  {
    key: "description",
    label: "Long description",
    rows: 5,
    hint: "what it does and who it is for",
    required: true,
  },
  { key: "launchDate", label: "Launch date", hint: "when did this become publicly usable?" },
  { key: "targetAudience", label: "Who is it for?", rows: 3, placeholder: "The people or teams this is built for" },
  { key: "problem", label: "What problem does it solve?", rows: 4, placeholder: "The problem this product helps people overcome" },
  { key: "features", label: "Key features", rows: 4, placeholder: "The most useful features, one per line" },
  { key: "useCases", label: "Use cases", rows: 3, placeholder: "One per line" },
  { key: "alternatives", label: "Alternatives", rows: 3, placeholder: "One per line" },
  { key: "pricing", label: "Pricing", placeholder: "Free · $5/mo · one-time $20" },
  { key: "socialLinks", label: "Social or community links", rows: 3, placeholder: "One URL per line (optional)" },
  { key: "faq", label: "FAQ", rows: 4, placeholder: "Question? Answer. (one per line)" },
];

const SUBMIT_FAQ = [
  {
    question: "How do I launch a new website in this directory?",
    answer:
      "Use this form to submit your launched website with a clear description and category so it can be reviewed by hand.",
  },
  {
    question: "Can I submit upcoming websites?",
    answer:
      "Yes. You can submit new and upcoming websites as long as people can visit a working public page.",
  },
  {
    question: "How can people find and discover my website here?",
    answer:
      "Accepted submissions appear in category browsing, search results, and can also show up in trending and collections.",
  },
];

export default function Submit() {
  const [draft, setDraft] = useState<SubmissionDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [badFields, setBadFields] = useState<string[]>([]);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedSite, setSubmittedSite] = useState<{ name: string; url: string } | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [autofillBusy, setAutofillBusy] = useState(false);
  const [autofillMessage, setAutofillMessage] = useState<string | null>(null);
  const [votesCast, setVotesCast] = useState(() => readVotedSlugs().length);

  /* The gate below is the last step: five votes before a submission can go out. */
  const votesReady = votesCast >= VOTES_REQUIRED;
  const votesLeft = Math.max(0, VOTES_REQUIRED - votesCast);

  /* Every configured category, including the niche ones no listing uses yet. */
  const openCategories = categoryChoices;

  function update<K extends keyof SubmissionDraft>(key: K, value: SubmissionDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleCategory(id: string) {
    setDraft((current) => ({
      ...current,
      categories: current.categories.includes(id)
        ? current.categories.filter((c) => c !== id)
        : [...current.categories, id],
    }));
  }

  async function handleAutofill() {
    if (!draft.url.trim()) {
      setAutofillMessage("Enter a URL first.");
      return;
    }
    setAutofillBusy(true);
    setAutofillMessage(null);
    const result = await autofillSite(draft.url.trim());
    setAutofillBusy(false);
    if (!result.ok) {
      setAutofillMessage(result.error);
      return;
    }
    setDraft((current) => ({
      ...current,
      url: result.value.url || current.url,
      name: current.name || result.value.name,
      tagline: current.tagline || result.value.tagline,
      description: current.description || result.value.description,
      supportsIframe: result.value.supportsIframe,
    }));
    setAutofillMessage("Filled what could be found. Review everything before submitting.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setBadFields([]);

    const result = await submitSite(draft);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      setBadFields(result.fields ?? []);
      return;
    }
    setSubmittedId(result.value.id);
    setSubmittedSite({ name: draft.name.trim(), url: draft.url.trim() });
    setEmbedCopied(false);
    setCopyError(false);
    setDraft(EMPTY_DRAFT);
  }

  if (submittedId) {
    const embedUrl = new URL("/embed", siteUrl);
    embedUrl.searchParams.set("name", submittedSite?.name ?? "A website");
    embedUrl.searchParams.set("url", submittedSite?.url ?? "");
    embedUrl.searchParams.set("status", "listed");
    const embedSrc = embedUrl.toString().replaceAll("&", "&amp;");
    const embedCode = `<iframe src="${embedSrc}" title="As seen on Boring Internet" width="280" height="76" loading="lazy" style="border:0;max-width:100%" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;

    return (
      <>
        <SiteSeo
          title="Submitted"
          description={`Your site was submitted to ${siteName} for review.`}
          path="/submit"
        />
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-5 text-center">
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
            Submission received
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">Sent for review</h1>
          <p className="text-base" style={{ color: "var(--muted)" }}>
            Your site is queued for a human check before it appears in the directory.
          </p>
          <p className="text-[12px] font-mono" style={{ color: "var(--muted)" }}>
            reference {submittedId}
          </p>
          <section className="submit-embed" aria-labelledby="submit-embed-title">
            <div className="flex flex-col gap-2 text-left">
              <span className="accent-text text-[11px] font-bold tracking-[0.18em] uppercase">
                Share your listing
              </span>
              <h2 id="submit-embed-title" className="text-xl font-bold">
                Add an “As seen on Boring Internet” badge
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                Copy this iframe snippet and paste it into your site’s HTML. The badge links back
                to Boring Internet and shows your site name and domain.
              </p>
            </div>
            <textarea
              className="embed-code"
              aria-label="Boring Internet badge iframe code"
              readOnly
              rows={3}
              value={embedCode}
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn accent"
                onClick={() => {
                  if (!navigator.clipboard?.writeText) {
                    setCopyError(true);
                    return;
                  }
                  void navigator.clipboard.writeText(embedCode).then(
                    () => {
                      setEmbedCopied(true);
                      setCopyError(false);
                    },
                    () => {
                      setEmbedCopied(false);
                      setCopyError(true);
                    },
                  );
                }}
              >
                {embedCopied ? "Copied iframe code" : "Copy iframe code"}
              </button>
              {copyError && (
                <span className="text-sm" role="status" style={{ color: "var(--muted)" }}>
                  Clipboard unavailable — select the code above and copy it manually.
                </span>
              )}
            </div>
            <p className="text-xs text-left" style={{ color: "var(--muted)" }}>
              Your submission is still under review. Please use the “As seen on” badge once your
              listing is approved.
            </p>
          </section>
          <BoostTraffic id="submit-boost" className="submit-boost" />
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            <button type="button" className="btn" onClick={() => setSubmittedId(null)}>
              Submit another
            </button>
            <Link to="/" className="btn ghost">
              Back to the directory
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteSeo
        title="Submit your site"
        description={`Add your launched site to ${siteName}. Every submission is reviewed by hand.`}
        path="/submit"
        keywords={[
          "launch new website",
          "submit website",
          "discover websites",
          "find websites",
          "new and upcoming websites",
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: SUBMIT_FAQ.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `Submit your site to ${siteName}`,
            url: `${siteUrl}/submit`,
            description: `Submit launched and upcoming websites for review.`,
            inLanguage: "en",
          },
        ]}
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        <header className="flex flex-col gap-3 border-b pb-6" style={{ borderColor: "var(--rule)" }}>
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
            Submit your site
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.02em]">
            Tell us what you launched
          </h1>
          <p className="text-base" style={{ color: "var(--muted)" }}>
            Everything here goes into the review queue. If it fits the list, it ships in the next
            update.
          </p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Want to see where your launch can appear? Explore{" "}
            <Link to="/discover-websites" className="accent-text font-bold underline underline-offset-4">
              discovery pages
            </Link>
            ,{" "}
            <Link to="/collections" className="accent-text font-bold underline underline-offset-4">
              curated collections
            </Link>
            , and{" "}
            <Link to="/trending" className="accent-text font-bold underline underline-offset-4">
              trending websites
            </Link>
            .
          </p>
        </header>

        {!submissionsConnected && (
          <p
            className="border px-4 py-3 text-[13px] leading-relaxed"
            style={{
              borderColor: "var(--rule)",
              backgroundColor: "var(--surface)",
              color: "var(--muted)",
            }}
          >
            The submission service is not connected yet, so this form cannot send anything. Set{" "}
            <code className="font-mono text-[12px]">VITE_VOTES_API_URL</code> to the deployed Worker
            URL.
          </p>
        )}

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {FIELDS.map((field) => {
            const invalid = badFields.includes(field.key);
            const borderColor = invalid ? "var(--accent)" : "var(--ink)";
            return (
              <div key={field.key} className="flex flex-col gap-2">
                <label
                  htmlFor={field.key}
                  className="text-[12px] font-bold tracking-[0.12em] uppercase"
                >
                  {field.label}
                  {field.required && <span className="accent-text"> *</span>}
                  {field.hint && (
                    <span
                      className="ml-2 text-[11px] font-normal tracking-normal normal-case"
                      style={{ color: "var(--muted)" }}
                    >
                      {field.hint}
                    </span>
                  )}
                </label>
                {field.rows ? (
                  <textarea
                    id={field.key}
                    rows={field.rows}
                    placeholder={field.placeholder}
                    value={draft[field.key]}
                    onChange={(event) => update(field.key, event.target.value)}
                    className="field"
                    style={{ borderColor }}
                  />
                ) : (
                  <input
                    id={field.key}
                    type={field.key === "url" ? "url" : field.key === "launchDate" ? "date" : "text"}
                    placeholder={field.placeholder}
                    value={draft[field.key]}
                    onChange={(event) => update(field.key, event.target.value)}
                    className="field"
                    style={{ borderColor }}
                  />
                )}
                {field.key === "url" && (
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" className="btn ghost" onClick={() => void handleAutofill()} disabled={autofillBusy || !submissionsConnected}>
                      {autofillBusy ? "Inspecting…" : "Autofill from URL"}
                    </button>
                    <span className="text-[12px]" style={{ color: "var(--muted)" }}>
                      Reads page metadata; no AI is used.
                    </span>
                    {autofillMessage && <span className="text-[12px]" style={{ color: "var(--muted)" }}>{autofillMessage}</span>}
                  </div>
                )}
              </div>
            );
          })}

          <fieldset className="flex flex-col gap-3">
            <legend className="text-[12px] font-bold tracking-[0.12em] uppercase">
              Categories <span className="accent-text">*</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {openCategories.map((category) => {
                const active = draft.categories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleCategory(category.id)}
                    className="border px-3 py-1.5 text-[13px] font-bold transition-colors hover:bg-[#1a120b] hover:text-[#fff7ee]"
                    style={{
                      borderColor: "var(--ink)",
                      backgroundColor: active ? "var(--accent)" : "#ffffff",
                      color: active ? "var(--on-accent)" : "var(--ink)",
                    }}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div
            className="flex items-center justify-between gap-4 border p-4"
            style={{ borderColor: "var(--rule)", backgroundColor: "var(--surface)" }}
          >
            <div>
              <p className="text-[12px] font-bold tracking-[0.12em] uppercase">Open source</p>
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                Turn this on if the source is public.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.openSource}
              aria-label="Open source"
              className="switch"
              onClick={() => update("openSource", !draft.openSource)}
            >
              <span className="switch-knob" />
            </button>
          </div>

          <div
            className="flex items-center justify-between gap-4 border p-4"
            style={{ borderColor: "var(--rule)", backgroundColor: "var(--surface)" }}
          >
            <div>
              <p className="text-[12px] font-bold tracking-[0.12em] uppercase">Supports iframe embedding</p>
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                Turn this on if the site allows other pages to embed it in an iframe.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.supportsIframe}
              aria-label="Supports iframe embedding"
              className="switch"
              onClick={() => update("supportsIframe", !draft.supportsIframe)}
            >
              <span className="switch-knob" />
            </button>
          </div>

          <VoteGate onCast={setVotesCast} />

          {error && (
            <p
              className="text-[13px] border px-4 py-3"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              {error}
              {badFields.length > 0 && ` (check: ${badFields.join(", ")})`}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="btn"
              disabled={busy || !submissionsConnected || !votesReady}
            >
              {busy ? "Sending…" : "Submit for review"}
            </button>
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>
              {votesReady
                ? "No account needed. Only what you type here is stored."
                : `Vote for ${votesLeft} more ${votesLeft === 1 ? "site" : "sites"} above to unlock submitting.`}
            </span>
          </div>
        </form>

        <section className="space-y-3 border-t pt-6" style={{ borderColor: "var(--rule)" }}>
          <h2 className="text-lg font-bold">Launch FAQ</h2>
          <dl className="space-y-3">
            {SUBMIT_FAQ.map((item) => (
              <div key={item.question}>
                <dt className="font-bold">{item.question}</dt>
                <dd className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}

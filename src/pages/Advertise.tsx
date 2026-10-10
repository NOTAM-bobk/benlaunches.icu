import { Link } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { siteName, siteUrl } from "../lib/siteData";

const OPTIONS = [
  {
    name: "Promoted spot",
    price: "$3",
    unit: "/ week",
    description: "A clearly labeled promoted position near the top of a relevant category.",
    details: ["One category placement", "Clearly labeled as promoted", "Seven-day run"],
  },
  {
    name: "Homepage spotlight",
    price: "$6",
    unit: "/ week",
    description: "A larger featured placement for a launch you want more people to notice.",
    details: ["Homepage feature slot", "Links directly to your site", "Seven-day run"],
    featured: true,
  },
  {
    name: "Instant verification",
    price: "$2",
    unit: " one time",
    description: "A verified mark for your listing after an automated ownership check.",
    details: ["Verified mark on your listing", "Domain ownership check", "One-time fee"],
  },
];

/**
 * Extras we can do around a launch, listed under the main placements. These are
 * one-off prices rather than weekly placements, so each card shows its own.
 */
const SERVICES = [
  {
    name: "Become a verified site",
    price: "$4",
    unit: " one time",
    description:
      "A person reviews your site by hand, then your listing keeps the verified mark and moves to the front of future feature and category queues.",
    featured: true,
  },
  {
    name: "SEO audit",
    price: "$8",
    unit: " one time",
    description:
      "A plain-English review of your technical SEO, page speed and on-page basics, returned as a prioritised list of fixes.",
  },
  {
    name: "Pre-launch checklist",
    price: "$4",
    unit: " one time",
    description:
      "Everything to run through before launch day: metadata, redirects, analytics, performance and the easy-to-miss details.",
  },
  {
    name: "Top 100 featured-on cards",
    price: "$1",
    unit: " one time",
    description:
      "A ready-made pack of 100 “featured on” badge cards to drop into your product page or footer.",
  },
  {
    name: "Get listed on 20 other directories",
    price: "$10",
    unit: " one time",
    description:
      "We submit your site to 20 hand-picked directories and launch platforms, so you start with a spread of quality listings.",
  },
];

export default function Advertise() {
  return (
    <>
      <SiteSeo
        title="Advertise with Boring Internet"
        description="Explore planned options for promoting a website or getting a verified mark on Boring Internet."
        path="/advertise"
        keywords={["advertise with Boring Internet", "promote a website", "verified website listing"]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Advertise with Boring Internet",
            url: `${siteUrl}/advertise`,
            description: "Planned options for promoting or verifying a website listing.",
            inLanguage: "en",
          },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8 sm:gap-10">
        <header className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
            Partner with {siteName}
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-[-0.03em]">
            Good sites deserve <span className="accent-text">to be found.</span>
          </h1>
          <p className="max-w-2xl text-base sm:text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
            Support a quieter corner of the web and help the right people discover what you made.
            Every paid placement will be clearly labeled.
          </p>
        </header>

        <div className="advertise-notice" role="status">
          <span className="advertise-notice-mark" aria-hidden="true">i</span>
          <p>
            <strong>Planned pricing — not live yet.</strong> These are draft rates for the options
            we are considering. Promotion, verification, and checkout are not available yet, and
            this page will not collect payment.
          </p>
        </div>

        <section aria-labelledby="advertise-options-heading" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 text-center">
            <h2 id="advertise-options-heading" className="text-2xl sm:text-3xl font-bold">
              Choose your kind of visibility
            </h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Proposed pricing in USD. All sponsored placements will be disclosed.
            </p>
          </div>

          <div className="advertise-grid">
            {OPTIONS.map((option) => (
              <article
                key={option.name}
                className={`advertise-card${option.featured ? " advertise-card-featured" : ""}`}
              >
                {option.featured && <span className="advertise-card-tag">Most visibility</span>}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold">{option.name}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    {option.description}
                  </p>
                </div>
                <p className="advertise-price">
                  <span>{option.price}</span> <small>{option.unit}</small>
                </p>
                <ul className="advertise-features">
                  {option.details.map((detail) => (
                    <li key={detail}><span aria-hidden="true">✓</span>{detail}</li>
                  ))}
                </ul>
                <span className="advertise-coming-soon">Coming soon</span>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="advertise-services-heading" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 text-center">
            <h2 id="advertise-services-heading" className="text-2xl sm:text-3xl font-bold">
              Other services
            </h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              One-off help around a launch — bought on its own or alongside a placement. Priced in USD.
            </p>
          </div>

          <div className="service-grid">
            {SERVICES.map((service) => (
              <article
                key={service.name}
                className={`service-card${service.featured ? " service-card-featured" : ""}`}
              >
                <div className="service-card-top">
                  <h3 className="text-lg font-bold">{service.name}</h3>
                  <p className="service-price">
                    <span>{service.price}</span> <small>{service.unit}</small>
                  </p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="advertise-submit">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">Still need to submit your site?</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Standard directory submissions are free and reviewed by a person. A paid spot will
              never be required to be considered.
            </p>
          </div>
          <Link to="/submit" className="btn accent">
            Submit your site <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </>
  );
}

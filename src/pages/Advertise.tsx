import { Link } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { serviceConfig, servicesInGroup, siteName, siteUrl } from "../lib/siteData";

/** Placements and services both live in config/services.json. */
const PLACEMENTS = servicesInGroup("placements");
const SERVICES = servicesInGroup("services");

export default function Advertise() {
  return (
    <>
      <SiteSeo
        title="Advertise with Boring Internet"
        description="Ways to promote a website or get a verified mark on Boring Internet. Prices in USD, paid through PayPal."
        path="/advertise"
        keywords={["advertise with Boring Internet", "promote a website", "verified website listing"]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Advertise with Boring Internet",
            url: `${siteUrl}/advertise`,
            description: "Ways to promote or verify a website listing, priced in USD.",
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
            <strong>Prices are live and paid through PayPal.</strong> Every option opens on a
            secure checkout page, and nothing is charged until you approve it in PayPal. Sponsored
            placements are always labeled as sponsored.
          </p>
        </div>

        <section aria-labelledby="advertise-options-heading" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 text-center">
            <h2 id="advertise-options-heading" className="text-2xl sm:text-3xl font-bold">
              Choose your kind of visibility
            </h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Priced in USD. All sponsored placements are disclosed.
            </p>
          </div>

          <div className="advertise-grid">
            {PLACEMENTS.map((option) => (
              <article
                key={option.id}
                className={`advertise-card${option.featured ? " advertise-card-featured" : ""}`}
              >
                {option.featured && <span className="advertise-card-tag">Most visibility</span>}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold">
                    <Link to={`/services/${option.id}`} className="card-title-link">
                      {option.name}
                    </Link>
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    {option.description}
                  </p>
                </div>
                <p className="advertise-price">
                  <span>{option.price}</span> <small>{option.unit}</small>
                </p>
                {option.details && option.details.length > 0 && (
                  <ul className="advertise-features">
                    {option.details.map((detail) => (
                      <li key={detail}><span aria-hidden="true">✓</span>{detail}</li>
                    ))}
                  </ul>
                )}
                <div className="advertise-card-foot">
                  <span className="advertise-coming-soon">Available now</span>
                  <Link to={`/services/${option.id}`} className="advertise-more">
                    More details <span aria-hidden="true">→</span>
                  </Link>
                </div>
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
                key={service.id}
                className={`service-card${service.featured ? " service-card-featured" : ""}`}
              >
                <div className="service-card-top">
                  <h3 className="text-lg font-bold">
                    <Link to={`/services/${service.id}`} className="card-title-link">
                      {service.name}
                    </Link>
                  </h3>
                  <p className="service-price">
                    <span>{service.price}</span> <small>{service.unit}</small>
                  </p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {service.description}
                </p>
                <Link to={`/services/${service.id}`} className="advertise-more">
                  More details <span aria-hidden="true">→</span>
                </Link>
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

        <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
          {serviceConfig.boost.note}
        </p>
      </div>
    </>
  );
}

import { Link, useParams } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { serviceById, serviceConfig, siteName, siteUrl } from "../lib/siteData";

/**
 * One paid option, opened from the boost list on the submit and badge pages.
 * The copy comes from `config/services.json`, so a price or a bullet is a
 * config edit rather than a code change.
 */
export default function ServiceDetail() {
  const { id = "" } = useParams();
  const service = serviceById(id);
  const { boost } = serviceConfig;

  if (!service) {
    return (
      <>
        <SiteSeo
          title="Service not found"
          description="That service does not exist."
          path={`/services/${id}`}
          noindex
        />
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-start gap-4">
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
            Not found
          </span>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">
            “{id}” is not one of the options
          </h1>
          <p style={{ color: "var(--muted)" }}>
            Every placement and service is listed on the advertise page, with prices.
          </p>
          <Link to="/advertise" className="btn accent">
            See all options <span aria-hidden="true">→</span>
          </Link>
        </div>
      </>
    );
  }

  const others = serviceConfig.items.filter((item) => item.id !== service.id);

  return (
    <>
      <SiteSeo
        title={`${service.name} — ${boost.eyebrow}`}
        description={service.description}
        path={`/services/${service.id}`}
        keywords={[service.name.toLowerCase(), "boost website traffic", `${siteName} services`]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${service.name} — ${boost.eyebrow}`,
            url: `${siteUrl}/services/${service.id}`,
            description: service.description,
            inLanguage: "en",
          },
        ]}
      />

      <main className="service-page mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <header className="service-head">
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
            {boost.eyebrow}
          </span>
          <h1>{service.name}</h1>
          <p className="service-price-line">
            <span className="service-price-value">{service.price}</span>{" "}
            <small>{service.unit}</small>
          </p>
          <p className="service-summary">{service.summary}</p>
        </header>

        <p className="service-notice" role="status">
          <span aria-hidden="true">i</span>
          Planned option — not on sale yet. Nothing here takes payment; this page describes what
          it would include.
        </p>

        <section className="service-block" aria-labelledby="service-includes">
          <h2 id="service-includes">What you get</h2>
          <ul className="service-includes">
            {service.includes.map((line) => (
              <li key={line}>
                <span aria-hidden="true">✓</span>
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section className="service-block" aria-labelledby="service-steps">
          <h2 id="service-steps">How it works</h2>
          <ol className="service-steps">
            {service.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="service-block" aria-labelledby="service-good-for">
          <h2 id="service-good-for">Good for</h2>
          <p className="service-good-for">{service.goodFor}</p>
        </section>

        <div className="service-actions">
          <Link to="/submit" className="btn accent">
            Submit your site <span aria-hidden="true">→</span>
          </Link>
          <Link to="/advertise" className="btn ghost">
            All options and prices
          </Link>
        </div>

        <section className="service-others" aria-labelledby="service-others-title">
          <h2 id="service-others-title">More ways to boost</h2>
          <ul className="boost-items">
            {others.map((item) => (
              <li key={item.id}>
                <Link to={`/services/${item.id}`} className="boost-item">
                  <span className="boost-item-copy">
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span className="boost-item-price">
                    <span>{item.price}</span>
                    <small>{item.unit}</small>
                  </span>
                  <span className="boost-item-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

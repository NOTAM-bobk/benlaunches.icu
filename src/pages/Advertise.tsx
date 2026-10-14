import { Link, useNavigate } from "react-router";
import { SiteSeo } from "../components/SeoHead";
import { addToCart } from "../lib/cart";
import { serviceById, serviceConfig, siteName, siteUrl } from "../lib/siteData";

/** One label / value pair under the price, like a plan's small print. */
interface PlanRow {
  label: string;
  value: string;
}

/** A card in the headline pricing table. */
interface Plan {
  /** The service it sells, or null for the free listing. */
  serviceId: string | null;
  name: string;
  blurb: string;
  price: string;
  unit: string;
  cta: string;
  to: string;
  featured: boolean;
  badge?: string;
  rows: PlanRow[];
  includes: string[];
}

/** " one time" / "for 30 days" -> a tidy line beside the price. */
function unitLabel(unit: string): string {
  const value = unit.trim();
  if (value.includes("one time")) return "one-time";
  if (value.startsWith("/")) return `per ${value.slice(1).trim()}`;
  return value;
}

/** Build a paid card from the service it sells, so config stays the source of truth. */
function paidPlan(
  serviceId: string,
  extra: { cta: string; rows: PlanRow[]; featured?: boolean; badge?: string },
): Plan {
  const service = serviceById(serviceId);
  return {
    serviceId,
    name: service?.name ?? serviceId,
    blurb: service?.description ?? "",
    price: service?.price ?? "",
    unit: unitLabel(service?.unit ?? ""),
    cta: extra.cta,
    to: `/services/${serviceId}`,
    featured: Boolean(extra.featured),
    badge: extra.badge,
    rows: extra.rows,
    includes: service?.includes ?? [],
  };
}

/** The free listing is not a paid service, so it is written out here. */
const FREE_PLAN: Plan = {
  serviceId: null,
  name: "Free",
  blurb: "For getting on the list with no commitment.",
  price: "$0",
  unit: "",
  cta: "Launch for free",
  to: "/submit",
  featured: false,
  rows: [
    { label: "Review", value: "By hand" },
    { label: "On the homepage", value: "7 days in the feed" },
    { label: "Backlink", value: "Nofollow" },
  ],
  includes: [
    "A product page and maker profile",
    "Upvotes and feedback from other makers",
    "A dofollow link once your listing is verified",
  ],
};

const PLANS: Plan[] = [
  FREE_PLAN,
  paidPlan("instant-verification", {
    cta: "Get verified",
    rows: [
      { label: "Review", value: "Automated ownership check" },
      { label: "On the homepage", value: "7 days in the feed" },
      { label: "Backlink", value: "Dofollow, permanent" },
    ],
  }),
  paidPlan("homepage-spotlight", {
    cta: "Get the spotlight",
    featured: true,
    badge: "Most popular",
    rows: [
      { label: "Review", value: "By hand" },
      { label: "On the homepage", value: "30 days pinned on top" },
      { label: "Backlink", value: "Dofollow, permanent" },
    ],
  }),
  paidPlan("directory-submissions", {
    cta: "Get distribution",
    rows: [
      { label: "Review", value: "By hand" },
      { label: "Reach", value: "20 hand-picked directories" },
      { label: "Backlink", value: "Dofollow, permanent" },
    ],
  }),
];

/** Services the table already sells, so the list below never repeats itself. */
const PLAN_SERVICE_IDS = new Set(
  PLANS.map((plan) => plan.serviceId).filter((id): id is string => Boolean(id)),
);

/** The rest of the catalogue, shown à la carte under the table. */
const MORE_SERVICES = serviceConfig.items.filter((item) => !PLAN_SERVICE_IDS.has(item.id));

/** Adds the plan to the basket and hands over to the checkout page. */
function BuyPlanButton({ id, label }: { id: string; label: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="btn pricing-cta"
      onClick={() => {
        addToCart(id);
        navigate("/checkout");
      }}
    >
      {label}
    </button>
  );
}

export default function Advertise() {
  return (
    <>
      <SiteSeo
        title="Pricing — advertise with Boring Internet"
        description="Simple, one-off pricing to launch and boost a website listing on Boring Internet. Prices in USD, paid through PayPal."
        path="/advertise"
        keywords={["pricing", "advertise with Boring Internet", "promote a website", "verified website listing"]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Pricing — advertise with Boring Internet",
            url: `${siteUrl}/advertise`,
            description: "One-off services and 30-day placements to launch and promote a website listing, priced in USD.",
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
              Pick how you launch
            </h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Priced in USD. Featured placements are one-time purchases for a full 30-day run; there is no recurring subscription.
            </p>
          </div>

          <div className="pricing-table">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={`pricing-card${plan.featured ? " pricing-card-featured" : ""}`}
              >
                <div className="pricing-head">
                  <h3 className="pricing-name">
                    {plan.serviceId ? (
                      <Link to={plan.to} className="card-title-link">
                        {plan.name}
                      </Link>
                    ) : (
                      plan.name
                    )}
                  </h3>
                  {plan.badge && <span className="pricing-badge">{plan.badge}</span>}
                </div>

                <p className="pricing-blurb">{plan.blurb}</p>

                <p className="pricing-price">
                  <span>{plan.price}</span>
                  {plan.unit && <small>{plan.unit}</small>}
                </p>

                {plan.serviceId ? (
                  <BuyPlanButton id={plan.serviceId} label={plan.cta} />
                ) : (
                  <Link to={plan.to} className="btn pricing-cta">
                    {plan.cta}
                  </Link>
                )}

                <dl className="pricing-rows">
                  {plan.rows.map((row) => (
                    <div key={row.label} className="pricing-row">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="pricing-includes">
                  <p className="pricing-includes-title">Includes:</p>
                  <ul>
                    {plan.includes.map((item) => (
                      <li key={item}>
                        <span aria-hidden="true">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {MORE_SERVICES.length > 0 && (
          <section aria-labelledby="advertise-services-heading" className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 text-center">
              <h2 id="advertise-services-heading" className="text-2xl sm:text-3xl font-bold">
                More ways to boost
              </h2>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                The rest of the one-off services — bought on their own or alongside a placement.
              </p>
            </div>

            <div className="service-grid">
              {MORE_SERVICES.map((service) => (
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
        )}

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

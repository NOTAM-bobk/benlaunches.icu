import { Link } from "react-router";
import { serviceConfig, servicesInGroup } from "../lib/siteData";

/**
 * The paid options, listed with their prices. Shown after a submission and on
 * the badge card page, so a fresh listing can find them without hunting for the
 * advertise page. Every row is a link to that service's own page.
 */
export function BoostTraffic({
  id = "boost-traffic",
  className = "",
}: {
  /** Lets two copies on one page keep their heading ids apart. */
  id?: string;
  className?: string;
}) {
  const { boost, groups } = serviceConfig;
  const headingId = `${id}-title`;

  return (
    <section
      className={`boost-section${className ? ` ${className}` : ""}`}
      aria-labelledby={headingId}
    >
      <header className="boost-head">
        <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
          {boost.eyebrow}
        </span>
        <h2 id={headingId} className="text-2xl sm:text-3xl font-bold tracking-[-0.02em]">
          {boost.title}
        </h2>
        <p className="boost-note">{boost.note}</p>
      </header>

      {groups.map((group) => {
        const items = servicesInGroup(group.id);
        if (items.length === 0) return null;
        return (
          <div key={group.id} className="boost-group">
            <div className="boost-group-head">
              <h3>{group.label}</h3>
              <p>{group.note}</p>
            </div>
            <ul className="boost-items">
              {items.map((item) => (
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
          </div>
        );
      })}

      <p className="boost-foot">
        <Link to="/advertise" className="boost-foot-link">
          See every option and how it works <span aria-hidden="true">→</span>
        </Link>
      </p>
    </section>
  );
}

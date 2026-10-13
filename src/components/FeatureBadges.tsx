import { featureBadges } from "../lib/badges";

/**
 * A continuously moving featured-on strip. The second copy makes the loop
 * seamless; it is hidden from assistive technology so every link is announced
 * only once. CSS pauses the marquee for hover, focus, and reduced motion.
 */
export function FeatureBadges() {
  if (featureBadges.length === 0) return null;

  return (
    <section className="footer-badges" aria-labelledby="footer-badges-heading">
      <p id="footer-badges-heading" className="footer-badges-label">Featured on</p>
      <div className="badge-viewport" role="region" aria-label="Featured on directories">
        <div className="badge-marquee">
          <div className="badge-marquee-group">
            {featureBadges.map((badge) => (
              <a
                key={badge.id}
                href={badge.href}
                target="_blank"
                rel="noopener noreferrer"
                {...badge.attributes}
                className="badge-slide"
              >
                <img
                  src={badge.image}
                  alt={badge.alt}
                  width={badge.width}
                  height={badge.height}
                  loading="lazy"
                  decoding="async"
                />
              </a>
            ))}
          </div>
          <div className="badge-marquee-group" aria-hidden="true">
            {featureBadges.map((badge) => (
              <a
                key={`${badge.id}-duplicate`}
                href={badge.href}
                tabIndex={-1}
                {...badge.attributes}
                className="badge-slide"
              >
                <img
                  src={badge.image}
                  alt=""
                  width={badge.width}
                  height={badge.height}
                  loading="lazy"
                  decoding="async"
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

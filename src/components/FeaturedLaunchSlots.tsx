import { Link } from "react-router";
import { SiteIcon } from "./SiteIcon";
import { ShareLaunchCard } from "./ShareLaunchCard";
import { categoryLabel, featuredLaunchSites, type Site } from "../lib/siteData";
import { formatDate } from "../lib/posts";
import { siteDomain } from "../lib/siteTile";

/**
 * The featured launch slots.
 *
 * A slot is not a paid placement here: it is a listing someone marked with
 * `"featured": true` in config/sites.json. Change the flag and the slot
 * changes on the next deploy — no code involved. The section disappears
 * entirely while no listing carries the flag.
 */
export function FeaturedLaunchSlots({ count = 3 }: { count?: number }) {
  const sites = featuredLaunchSites(count);
  if (sites.length === 0) return null;

  return (
    <section className="feature-slots" aria-labelledby="feature-slots-heading">
      <div className="feature-slots-head">
        <div>
          <span className="section-eyebrow">Featured launch slots</span>
          <h2 id="feature-slots-heading" className="text-xl font-bold tracking-[-0.01em]">
            Hand-picked this week
          </h2>
        </div>
        <p className="feature-slots-note">
          Marked <code>"featured": true</code> in <code>config/sites.json</code>
        </p>
      </div>

      <ul className="feature-slot-grid">
        {sites.map((site, index) => (
          <Slot key={site.id} site={site} rank={index + 1} />
        ))}
      </ul>
    </section>
  );
}

function Slot({ site, rank }: { site: Site; rank: number }) {
  const domain = siteDomain(site.url);
  const tagline = (site.extras?.tagline || site.description || "").trim();

  return (
    <li className="feature-slot">
      <div className="feature-slot-top">
        <span className="feature-slot-rank">Slot {rank}</span>
        <span className="feature-slot-tag">Featured</span>
      </div>

      <div className="feature-slot-head">
        <SiteIcon site={site} size={38} label={false} />
        <div className="feature-slot-title">
          <Link to={`/sites/${site.slug}`} className="feature-slot-name">
            {site.name}
          </Link>
          <a href={site.url} target="_blank" rel="noopener noreferrer" className="feature-slot-domain">
            {domain} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      <p className="feature-slot-blurb">{tagline}</p>

      <span className="feature-slot-meta">
        {categoryLabel(site.category)}
        {site.launched ? ` · ${formatDate(site.launched)}` : ""}
      </span>

      <div className="feature-slot-actions">
        <a href={site.url} target="_blank" rel="noopener noreferrer" className="btn accent">
          Visit {domain}
        </a>
        <ShareLaunchCard site={site} className="mycol-mini-btn" />
      </div>
    </li>
  );
}

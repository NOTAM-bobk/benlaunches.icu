import { Link } from "react-router";
import { SiteIcon } from "./SiteIcon";
import { VerifiedStamp } from "./VerifiedStamp";
import { humanizeKey, type Site } from "../lib/siteData";

/** How many tag diamonds a row shows before it stops. */
const TAG_LIMIT = 3;

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * One row of a ranking list: the medal or position, the site's icon, its name,
 * description and tag diamonds, and the round vote button on the right. Shared
 * by the trending page and the "needs some votes" strip so both lists read the
 * same way.
 */
export function SiteVoteRow({
  site,
  rank,
  medal = false,
  count,
  voted,
  pending = false,
  leader = false,
  onVote,
}: {
  site: Site;
  /** Position in the list this row belongs to. */
  rank: number;
  /** Give the top three their medals instead of a plain position. */
  medal?: boolean;
  count: number;
  voted: boolean;
  pending?: boolean;
  /** The current top site gets the filled button. */
  leader?: boolean;
  onVote: () => void;
}) {
  // A listing with no tags of its own still gets one line: its category.
  const tags = site.tags.length > 0 ? site.tags.slice(0, TAG_LIMIT) : [site.category];

  return (
    <li className={`vote-row${leader ? " vote-row-leader" : ""}`}>
      <span
        className={`vote-row-rank${medal ? " vote-row-medal" : ""}`}
        title={`Position ${rank}`}
      >
        <span aria-hidden="true">{medal && rank <= 3 ? MEDALS[rank - 1] : `#${rank}`}</span>
        <span className="sr-only">{`Position ${rank}`}</span>
      </span>

      <SiteIcon site={site} size={56} label={false} />

      <div className="vote-row-body">
        <div className="vote-row-head">
          <Link to={`/sites/${site.slug}`} className="vote-row-name" title={site.name}>
            {site.name}
          </Link>
          {site.verified && <VerifiedStamp />}
        </div>
        <p className="vote-row-description">{site.description}</p>
        <ul className="vote-row-tags">
          {tags.map((tag) => (
            <li key={tag}>
              <span className="vote-row-diamond" aria-hidden="true">
                ◇
              </span>
              {humanizeKey(tag)}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className={`vote-circle${voted ? " voted" : ""}`}
        onClick={onVote}
        disabled={voted || pending}
        aria-label={
          voted
            ? `${site.name}, you voted, ${count} votes`
            : `Vote for ${site.name}, ${count} ${count === 1 ? "vote" : "votes"}`
        }
        title={voted ? "You already voted for this site" : "Vote for this site"}
      >
        <span className="vote-circle-arrow" aria-hidden="true">
          {voted ? "✓" : "▲"}
        </span>
        <span className="vote-circle-count">{pending ? "…" : count}</span>
      </button>
    </li>
  );
}

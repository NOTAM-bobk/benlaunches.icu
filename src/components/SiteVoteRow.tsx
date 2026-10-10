import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { SiteIcon } from "./SiteIcon";
import { VerifiedStamp } from "./VerifiedStamp";
import { humanizeKey, type Site } from "../lib/siteData";

/** How many tag diamonds a row shows before it stops. */
const TAG_LIMIT = 3;

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * The confetti thrown when a vote lands: a fixed spray of sixteen pieces, so the
 * burst renders identically every time and needs no randomness at render time.
 */
const CONFETTI_PIECES: ReadonlyArray<{
  x: number;
  y: number;
  rot: number;
  delay: number;
  color: string;
}> = [
  { x: 0, y: -46, rot: 220, delay: 0, color: "#d9601f" },
  { x: 34, y: -32, rot: -180, delay: 20, color: "#f6c445" },
  { x: 46, y: 4, rot: 140, delay: 40, color: "#1d9bf0" },
  { x: 30, y: 34, rot: -260, delay: 10, color: "#2f8f6f" },
  { x: 0, y: 46, rot: 300, delay: 30, color: "#d9601f" },
  { x: -30, y: 34, rot: -120, delay: 50, color: "#f6c445" },
  { x: -46, y: 4, rot: 200, delay: 0, color: "#1d9bf0" },
  { x: -34, y: -32, rot: -220, delay: 25, color: "#2f8f6f" },
  { x: 18, y: -42, rot: 160, delay: 45, color: "#fff7ee" },
  { x: 42, y: -16, rot: -300, delay: 15, color: "#d9601f" },
  { x: 42, y: 18, rot: 240, delay: 35, color: "#f6c445" },
  { x: 16, y: 44, rot: -160, delay: 5, color: "#1d9bf0" },
  { x: -18, y: 42, rot: 280, delay: 55, color: "#2f8f6f" },
  { x: -42, y: 16, rot: -240, delay: 20, color: "#fff7ee" },
  { x: -42, y: -18, rot: 180, delay: 40, color: "#d9601f" },
  { x: -16, y: -42, rot: -200, delay: 10, color: "#f6c445" },
];

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
  /* The burst key: it changes on every vote, which restarts the animation, and
     drops back to zero once the paper has had time to land. */
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!burst) return;
    const timer = window.setTimeout(() => setBurst(0), 1000);
    return () => window.clearTimeout(timer);
  }, [burst]);

  function handleVote() {
    if (voted || pending) return;
    setBurst((value) => value + 1);
    onVote();
  }

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
        onClick={handleVote}
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
        {burst > 0 && (
          <span className="vote-confetti" aria-hidden="true">
            {CONFETTI_PIECES.map((piece, index) => (
              <i
                key={`${burst}-${index}`}
                style={
                  {
                    "--tx": `${piece.x}px`,
                    "--ty": `${piece.y}px`,
                    "--rot": `${piece.rot}deg`,
                    "--delay": `${piece.delay}ms`,
                    background: piece.color,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        )}
      </button>
    </li>
  );
}

/**
 * The little blue stamp beside a listing a person has opened and checked by
 * hand. Which listings carry it is set per site in `config/sites.json` with the
 * `verified` flag, so marking one is a config edit, not a code change.
 */
export function VerifiedStamp({
  size = 15,
  label = "Verified listing: checked by hand",
}: {
  size?: number;
  /** Read out by screen readers, since the stamp carries the meaning alone. */
  label?: string;
}) {
  return (
    <svg
      className="verified-stamp"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      role="img"
      aria-label={label}
    >
      <circle cx="10" cy="10" r="9.2" fill="var(--verified)" />
      <path
        d="M5.6 10.4l2.9 2.9 5.9-6.3"
        fill="none"
        stroke="#fff"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

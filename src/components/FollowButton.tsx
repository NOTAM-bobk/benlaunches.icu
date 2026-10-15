import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { useSignInPrompt } from "../lib/signInPrompt";
import { followCurator, isFollowing } from "../lib/userCollections";

/**
 * Follow a curator. The button tracks from the follow graph on mount, so it is
 * correct on a fresh page load, and never offers to follow yourself.
 */
export function FollowButton({
  curatorId,
  curatorName,
  followers,
  className = "btn ghost",
  onChange,
}: {
  curatorId: string;
  curatorName: string;
  /** Server-known follower count, if the page already has it. */
  followers?: number;
  className?: string;
  onChange?: (following: boolean, followers: number) => void;
}) {
  const { user } = useAuth();
  const askSignIn = useSignInPrompt();
  const [following, setFollowing] = useState(false);
  /* The count the page already knows, until a follow changes it here. */
  const [localCount, setLocalCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const own = user?.id === curatorId;
  const count = localCount ?? followers ?? 0;

  useEffect(() => {
    let active = true;
    void isFollowing(curatorId).then((value) => {
      if (active) setFollowing(value);
    });
    return () => {
      active = false;
    };
  }, [curatorId, user?.id]);

  if (own) return null;

  async function toggle() {
    if (!user) {
      askSignIn(`follow ${curatorName}`);
      return;
    }
    setBusy(true);
    const result = await followCurator(curatorId, !following);
    setBusy(false);
    if (!result.ok) return;
    setFollowing(result.value.following);
    setLocalCount(result.value.followers);
    onChange?.(result.value.following, result.value.followers);
  }

  return (
    <button
      type="button"
      className={className}
      aria-pressed={following}
      disabled={busy}
      onClick={() => void toggle()}
    >
      {following ? "Following ✓" : `Follow ${curatorName.split(" ")[0] || ""}`.trim()}
      {count > 0 && <span className="follow-count">{count}</span>}
    </button>
  );
}

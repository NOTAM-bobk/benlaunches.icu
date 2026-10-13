import { avatarUrl, homeAvatars } from "../lib/avatars";

/**
 * The line-up of avatars under the home page buttons: a crowd of different
 * DiceBear styles in circles. Purely decorative, so it stays out of the
 * accessibility tree and the images carry no alt text.
 */
export function AvatarRow() {
  return (
    <div className="avatar-row" aria-hidden="true">
      {homeAvatars.map((avatar) => (
        <span className="avatar" key={avatar.seed}>
          <img src={avatarUrl(avatar)} alt="" decoding="async" />
        </span>
      ))}
    </div>
  );
}

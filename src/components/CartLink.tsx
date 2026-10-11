import { Link } from "react-router";
import { useCart } from "../lib/cart";

/**
 * A way back to the basket once something is in it. Rendered only while the
 * basket has something, so the header is unchanged for everyone else.
 */
export function CartLink() {
  const cart = useCart();
  const count = cart.reduce((sum, entry) => sum + entry.qty, 0);
  if (count === 0) return null;

  return (
    <Link to="/checkout" className="cart-link">
      <span aria-hidden="true">🧺</span> Basket <span className="cart-link-count">{count}</span>
    </Link>
  );
}

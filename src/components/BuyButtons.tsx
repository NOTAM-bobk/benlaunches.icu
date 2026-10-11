import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { addToCart } from "../lib/cart";

/** Puts an option in the basket and says so, without leaving the page. */
export function AddToCartButton({ id, className = "btn ghost" }: { id: string; className?: string }) {
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={`${className}${added ? " added" : ""}`}
      onClick={() => {
        addToCart(id);
        setAdded(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setAdded(false), 2400);
      }}
    >
      {added ? (
        <>
          In your basket <span aria-hidden="true">✓</span>
        </>
      ) : (
        "Add to basket"
      )}
    </button>
  );
}

/** Puts an option in the basket and goes straight to the checkout page. */
export function BuyNowButton({ id, className = "btn accent" }: { id: string; className?: string }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        addToCart(id);
        navigate("/checkout");
      }}
    >
      Buy now <span aria-hidden="true">→</span>
    </button>
  );
}

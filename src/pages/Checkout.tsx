import { Suspense, lazy } from "react";
import { Link, useNavigate } from "react-router";
import { CheckoutContact, PaymentPromises } from "../components/CheckoutContact";
import { SiteSeo } from "../components/SeoHead";
import {
  MAX_CART_QUANTITY,
  addToCart,
  clearCart,
  removeFromCart,
  setCartQuantity,
  useCart,
} from "../lib/cart";
import {
  checkoutCopy,
  formatUsd,
  lineFor,
  rememberOrder,
  sellableServices,
  totalCents,
  type CheckoutLine,
  type PaidOrder,
} from "../lib/checkout";

/**
 * PayPal's own script is fetched on this page and nowhere else, so the promise
 * that the directory itself tracks nobody stays true.
 */
const PayPalCheckout = lazy(() => import("../components/PayPalCheckout.tsx"));

/**
 * A clean, single-column checkout: what you picked, what it costs, how to pay.
 * It never shows a price of its own — every figure comes from config and is
 * checked again on the server before PayPal is asked for anything.
 */
export default function Checkout() {
  const cart = useCart();
  const navigate = useNavigate();
  const lines = cart
    .map((entry) => lineFor(entry.id, entry.qty))
    .filter((line): line is CheckoutLine => line !== null);
  const total = totalCents(lines);
  const rest = sellableServices.filter((item) => !cart.some((entry) => entry.id === item.id));

  function handlePaid(order: PaidOrder) {
    rememberOrder(order);
    clearCart();
    navigate(`/checkout/success?order=${encodeURIComponent(order.orderId)}`, {
      state: { order },
      replace: true,
    });
  }

  return (
    <>
      <SiteSeo
        title={checkoutCopy.title}
        description={checkoutCopy.intro}
        path="/checkout"
        noindex
      />

      <main className="checkout-page mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <header className="checkout-head">
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
            {checkoutCopy.eyebrow}
          </span>
          <h1>{checkoutCopy.title}</h1>
          <p className="checkout-intro">{checkoutCopy.intro}</p>
        </header>

        <section className="checkout-panel" aria-labelledby="checkout-basket">
          <h2 id="checkout-basket">Your basket</h2>

          {lines.length === 0 ? (
            <div className="checkout-empty">
              <p>Nothing in the basket yet.</p>
              <p>
                Placements and one-off services are all listed below with their prices. Pick one and
                it lands here.
              </p>
            </div>
          ) : (
            <ul className="checkout-lines">
              {lines.map((line) => (
                <li key={line.item.id} className="checkout-line">
                  <span className="checkout-line-copy">
                    <strong>{line.item.name}</strong>
                    <small>
                      {formatUsd(line.cents)}
                      {line.item.unit}
                    </small>
                  </span>

                  <span className="checkout-qty">
                    <button
                      type="button"
                      aria-label={`One fewer ${line.item.name}`}
                      onClick={() => setCartQuantity(line.item.id, line.qty - 1)}
                    >
                      <span aria-hidden="true">−</span>
                    </button>
                    <output>{line.qty}</output>
                    <button
                      type="button"
                      aria-label={`One more ${line.item.name}`}
                      disabled={line.qty >= MAX_CART_QUANTITY}
                      onClick={() => setCartQuantity(line.item.id, line.qty + 1)}
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  </span>

                  <span className="checkout-line-total">{formatUsd(line.totalCents)}</span>

                  <button
                    type="button"
                    className="checkout-line-remove"
                    onClick={() => removeFromCart(line.item.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {lines.length > 0 && (
            <p className="checkout-total">
              <span>Total, charged once in {checkoutCopy.currency}</span>
              <strong>{formatUsd(total)}</strong>
            </p>
          )}
        </section>

        {rest.length > 0 && (
          <section className="checkout-extras" aria-labelledby="checkout-more">
            <h2 id="checkout-more">
              {lines.length === 0 ? "Pick something to buy" : "Add another option"}
            </h2>
            <ul className="checkout-extras-list">
              {rest.map((item) => (
                <li key={item.id}>
                  <span className="checkout-extras-copy">
                    <Link to={`/services/${item.id}`}>{item.name}</Link>
                    <small>{item.description}</small>
                  </span>
                  <span className="checkout-extras-price">
                    {item.price}
                    <small>{item.unit}</small>
                  </span>
                  <button type="button" onClick={() => addToCart(item.id)}>
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="checkout-facts" aria-label="How payment works">
          <PaymentPromises />
          <CheckoutContact />
        </section>

        {lines.length > 0 && (
          <section className="checkout-pay" aria-labelledby="checkout-pay-title">
            <h2 id="checkout-pay-title">Pay {formatUsd(total)}</h2>
            <Suspense fallback={<p className="checkout-pay-loading">Getting the payment form ready…</p>}>
              <PayPalCheckout lines={lines} onPaid={handlePaid} />
            </Suspense>
          </section>
        )}

        <p className="checkout-foot">
          <Link to="/advertise">What each option includes</Link>
          <span aria-hidden="true">·</span>
          <Link to="/submit">Submit your site first</Link>
        </p>
      </main>
    </>
  );
}

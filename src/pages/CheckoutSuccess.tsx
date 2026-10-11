import { Link, useLocation, useSearchParams } from "react-router";
import { CheckoutContact } from "../components/CheckoutContact";
import { SiteSeo } from "../components/SeoHead";
import {
  checkoutCopy,
  contactMailto,
  formatMoney,
  formatPaidAt,
  recallOrder,
  type PaidOrder,
} from "../lib/checkout";

/**
 * The receipt. Every figure on this page came back from PayPal's capture, never
 * from the basket, so what is shown here is what was actually paid.
 */
export default function CheckoutSuccess() {
  const location = useLocation();
  const [params] = useSearchParams();
  const fromRoute = (location.state as { order?: PaidOrder } | null)?.order ?? null;
  const order = fromRoute ?? recallOrder();
  const lookupId = params.get("order") ?? order?.orderId ?? "";
  const { success } = checkoutCopy;

  return (
    <>
      <SiteSeo
        title={order ? success.title : "Order details"}
        description={success.intro}
        path="/checkout/success"
        noindex
      />

      <main className="checkout-page mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <header className="checkout-head">
          <span className="accent-text text-[11px] font-bold tracking-[0.2em] uppercase">
            {success.eyebrow}
          </span>
          <h1>{order ? success.title : "We cannot find that order here"}</h1>
          <p className="checkout-intro">
            {order
              ? success.intro
              : "Order details live in the tab that paid, and this one does not have them. If PayPal took a payment, the receipt is in your PayPal account and we have it too."}
          </p>
        </header>

        {order ? (
          <>
            <section className="checkout-panel receipt" aria-labelledby="receipt-title">
              <h2 id="receipt-title">Your receipt</h2>

              <ul className="receipt-items">
                {order.items.map((item) => (
                  <li key={`${item.name}-${item.quantity}-${item.unitAmount}`}>
                    <span className="receipt-item-name">
                      {item.name}
                      {item.quantity > 1 && <small>× {item.quantity}</small>}
                    </span>
                    <span className="receipt-item-amount">
                      {formatMoney(item.unitAmount, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="checkout-total">
                <span>Paid</span>
                <strong>{formatMoney(order.total, order.currency)}</strong>
              </p>

              <dl className="receipt-meta">
                <div>
                  <dt>Order</dt>
                  <dd>{order.orderId}</dd>
                </div>
                {order.captureId && (
                  <div>
                    <dt>Transaction</dt>
                    <dd>{order.captureId}</dd>
                  </div>
                )}
                {formatPaidAt(order.paidAt) && (
                  <div>
                    <dt>When</dt>
                    <dd>{formatPaidAt(order.paidAt)}</dd>
                  </div>
                )}
                {order.payer.email && (
                  <div>
                    <dt>Paid as</dt>
                    <dd>{order.payer.email}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="checkout-facts" aria-labelledby="success-next">
              <h2 id="success-next">What happens next</h2>
              <ol className="service-steps">
                {success.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          </>
        ) : (
          <section className="checkout-panel">
            {lookupId && (
              <p className="receipt-lookup">
                Reference <code>{lookupId}</code> — quote that and we can find the payment in a
                moment.
              </p>
            )}
          </section>
        )}

        <section className="checkout-facts" aria-label="Contact">
          <CheckoutContact label={success.contactLabel} />
        </section>

        <p className="checkout-foot">
          <Link to="/advertise">All options and prices</Link>
          <span aria-hidden="true">·</span>
          <Link to="/">Back to the list</Link>
          <span aria-hidden="true">·</span>
          <a href={contactMailto(checkoutCopy)}>Email us about this order</a>
        </p>
      </main>
    </>
  );
}

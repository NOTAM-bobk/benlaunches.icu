import { checkoutCopy, contactMailto, contactTel } from "../lib/checkout";

/** The people behind the checkout, in case something needs asking first. */
export function CheckoutContact({ label }: { label?: string } = {}) {
  const { contact } = checkoutCopy;

  return (
    <div className="checkout-contact">
      <h2>{label ?? contact.label}</h2>
      <p className="checkout-contact-line">
        <a href={contactMailto(checkoutCopy)}>{contact.email}</a>
        <span aria-hidden="true">·</span>
        <a href={contactTel(checkoutCopy)}>{contact.phone}</a>
      </p>
      <p className="checkout-contact-note">{contact.note}</p>
    </div>
  );
}

/** What we will and will not do with a payment. */
export function PaymentPromises() {
  return (
    <ul className="checkout-promises">
      {checkoutCopy.promises.map((line) => (
        <li key={line}>
          <span aria-hidden="true">✓</span>
          {line}
        </li>
      ))}
    </ul>
  );
}

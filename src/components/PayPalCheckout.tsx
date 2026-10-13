import { PayPalOneTimePaymentButton, PayPalProvider } from "@paypal/react-paypal-js/sdk-v6";
import { useCallback, useEffect, useMemo, useState } from "react";
import { checkoutCopy, contactMailto, formatUsd, totalCents, type CheckoutLine, type PaidOrder } from "../lib/checkout";

interface PayPalConfig {
  enabled: boolean;
  clientId: string;
  environment: "sandbox" | "production";
  currency: string;
}

/** Reads a JSON response, or throws the server's own sentence. */
async function post(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "That payment could not be started.",
    );
  }
  return data;
}

/**
 * The PayPal half of the checkout page. Loaded lazily, so PayPal's script is
 * only ever fetched on this one page — the directory itself stays free of it.
 */
export default function PayPalCheckout({
  lines,
  onPaid,
}: {
  lines: CheckoutLine[];
  onPaid: (order: PaidOrder) => void;
}) {
  const [config, setConfig] = useState<PayPalConfig | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const { offline } = checkoutCopy;

  useEffect(() => {
    let alive = true;
    fetch("/api/paypal/config", { headers: { accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("config"))))
      .then((data: PayPalConfig) => {
        if (alive) setConfig(data);
      })
      .catch(() => {
        if (alive) setUnreachable(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const items = useMemo(() => lines.map((line) => ({ id: line.item.id, qty: line.qty })), [lines]);
  const amount = formatUsd(totalCents(lines));

  const createOrder = useCallback(async () => {
    setNotice("");
    const data = await post("/api/paypal/create-order", { items });
    if (typeof data.orderId !== "string") throw new Error("PayPal did not return an order.");
    return { orderId: data.orderId };
  }, [items]);

  const approve = useCallback(
    async ({ orderId }: { orderId: string }) => {
      setBusy(true);
      setNotice("");
      try {
        const data = await post("/api/paypal/capture-order", { orderId });
        onPaid(data as unknown as PaidOrder);
      } finally {
        setBusy(false);
      }
    },
    [onPaid],
  );

  if (unreachable || (config && !config.enabled)) {
    return (
      <div className="checkout-offline" role="status">
        <h2>{offline.title}</h2>
        <p>{offline.body}</p>
        <a className="btn accent" href={contactMailto(checkoutCopy)}>
          {offline.emailAction}
        </a>
      </div>
    );
  }

  if (!config) {
    return <p className="checkout-pay-loading">Getting the payment form ready…</p>;
  }

  return (
    <div className="checkout-pay-box">
      <PayPalProvider
        clientId={config.clientId}
        environment={config.environment}
        components={["paypal-payments"]}
        pageType="checkout"
      >
        <PayPalOneTimePaymentButton
          type="checkout"
          disabled={busy || lines.length === 0}
          createOrder={createOrder}
          onApprove={approve}
          onCancel={() => setNotice("Payment cancelled — nothing has been charged.")}
          onError={(data: unknown) => {
            console.error("[paypal] button error", data);
            setNotice(
              "PayPal could not finish that. Nothing has been charged — try again, or email us and we will take it from here.",
            );
          }}
        />
      </PayPalProvider>

      <p className="checkout-pay-total">
        Total due now: <strong>{amount}</strong>
      </p>
      <p className="checkout-pay-note">
        You approve the payment in PayPal, so your card details never touch this site. PayPal's own
        script is only loaded on this page.
      </p>

      {notice && (
        <p className="checkout-error" role="alert">
          {notice}
        </p>
      )}
    </div>
  );
}

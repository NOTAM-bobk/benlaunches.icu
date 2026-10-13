/**
 * Creates a PayPal order for a cart the server prices itself. The browser sends
 * ids and quantities; every amount is looked up in `config/services.json`.
 */
import { randomUUID } from "node:crypto";

import {
  CURRENCY,
  describePayPalError,
  dollars,
  isSameOrigin,
  jsonBody,
  jsonResponse,
  methodNotAllowed,
  orderBody,
  ordersController,
  priceCart,
} from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(res, "POST");
    return;
  }
  if (!isSameOrigin(req)) {
    jsonResponse(res, 403, { error: "forbidden_origin" });
    return;
  }

  const orders = ordersController();
  if (!orders) {
    jsonResponse(res, 503, {
      error: "checkout_offline",
      message: "Checkout is not switched on for this deployment yet.",
    });
    return;
  }

  const priced = priceCart(jsonBody(req).items);
  if (priced.error) {
    jsonResponse(res, 400, { error: "invalid_cart", message: priced.error });
    return;
  }

  try {
    const { result } = await orders.createOrder({
      body: orderBody(priced.lines, priced.totalCents),
      // PayPal replays the same order if this id repeats, so a double click
      // cannot create two of them.
      paypalRequestId: randomUUID(),
      prefer: "return=representation",
    });

    if (!result?.id) {
      console.error("[paypal] create-order returned no order id");
      jsonResponse(res, 502, { error: "paypal_error", message: "PayPal did not return an order." });
      return;
    }

    jsonResponse(res, 200, {
      orderId: result.id,
      currency: CURRENCY,
      total: dollars(priced.totalCents),
      totalCents: priced.totalCents,
      lines: priced.lines.map(({ id, name, unit, cents, qty }) => ({ id, name, unit, cents, qty })),
    });
  } catch (error) {
    const reference = randomUUID().slice(0, 8);
    console.error(`[paypal] create-order failed (${reference})`, describePayPalError(error));
    jsonResponse(res, 502, {
      error: "paypal_error",
      message: "PayPal would not start that payment. Please try again.",
      reference,
    });
  }
}

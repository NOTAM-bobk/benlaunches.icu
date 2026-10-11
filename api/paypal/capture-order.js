/**
 * Captures an approved order and reports back what was actually paid, so the
 * success page can only ever show figures that came from PayPal.
 */
import { randomUUID } from "node:crypto";

import {
  describePayPalError,
  dollars,
  isSameOrigin,
  jsonBody,
  jsonResponse,
  methodNotAllowed,
  ordersController,
  priceToCents,
  recordCompletedPayment,
} from "./_lib.js";

/** Order ids look like "5O190127TN364715T"; anything else never reaches PayPal. */
function validOrderId(value) {
  return typeof value === "string" && /^[A-Za-z0-9-]{6,64}$/.test(value);
}

/** Adds up the order's own line items and checks them against the capture. */
function checkAmounts(order, captureValue) {
  const items = order?.purchaseUnits?.[0]?.items;
  if (!Array.isArray(items) || items.length === 0) return { verified: false, expected: null };
  let expected = 0;
  for (const item of items) {
    const unit = priceToCents(item?.unitAmount?.value);
    const qty = Number(item?.quantity ?? 0);
    if (unit === null || !Number.isInteger(qty) || qty < 1) return { verified: false, expected: null };
    expected += unit * qty;
  }
  return { verified: dollars(expected) === captureValue, expected: dollars(expected) };
}

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

  const orderId = jsonBody(req).orderId;
  if (!validOrderId(orderId)) {
    jsonResponse(res, 400, { error: "invalid_order", message: "That order id does not look right." });
    return;
  }

  try {
    const { result } = await orders.captureOrder({
      id: orderId,
      prefer: "return=representation",
    });

    if (result?.status !== "COMPLETED") {
      jsonResponse(res, 402, {
        error: "not_completed",
        status: result?.status ?? "UNKNOWN",
        message: "PayPal has not completed that payment yet.",
      });
      return;
    }

    const capture = result.purchaseUnits?.[0]?.payments?.captures?.[0] ?? {};
    const amounts = checkAmounts(result, capture?.amount?.value);
    if (!amounts.verified) {
      console.warn(
        `[paypal] capture ${capture?.id ?? orderId}: amount ${capture?.amount?.value} vs items ${amounts.expected}`,
      );
    }

    const purchase = {
      status: "COMPLETED",
      orderId: result.id ?? orderId,
      captureId: capture.id ?? "",
      paidAt: capture.createTime ?? "",
      currency: capture.amount?.currencyCode ?? "",
      total: capture.amount?.value ?? "",
      payer: {
        name: result.payer?.name?.givenName
          ? `${result.payer.name.givenName} ${result.payer.name.surname ?? ""}`.trim()
          : "",
        email: result.payer?.emailAddress ?? "",
      },
      items: (result.purchaseUnits?.[0]?.items ?? []).map((item) => ({
        name: item?.name ?? "",
        quantity: Number(item?.quantity ?? 1),
        unitAmount: item?.unitAmount?.value ?? "",
      })),
      amountMatchesItems: amounts.verified,
      recordedAt: new Date().toISOString(),
    };
    const queue = await recordCompletedPayment(purchase);
    if (!queue.recorded) {
      console.error(`[paypal] purchase ${purchase.orderId} was paid but not added to admin queue: ${queue.reason}`);
    }
    jsonResponse(res, 200, { ...purchase, purchaseRecorded: queue.recorded });
  } catch (error) {
    const reference = randomUUID().slice(0, 8);
    console.error(`[paypal] capture-order failed (${reference})`, describePayPalError(error));
    jsonResponse(res, 502, {
      error: "paypal_error",
      message: "PayPal would not finish that payment. If you were charged, email us and we will sort it out.",
      reference,
    });
  }
}

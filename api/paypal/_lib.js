/**
 * Shared plumbing for the PayPal functions in this folder.
 *
 * `api/paypal/_lib.js` is not reachable as an endpoint (Vercel skips files and
 * folders that start with an underscore), so all of this is only ever used by
 * the three handlers beside it.
 *
 * Prices come from `config/services.json` — the same file the advertise page
 * reads — so a price change is one config edit, and a browser cannot talk the
 * server down to a price of its own choosing.
 */
import {
  ApiError,
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrdersController,
} from "@paypal/paypal-server-sdk";

import servicesConfig from "../../config/services.json" with { type: "json" };

export const CURRENCY = (process.env.PAYPAL_CURRENCY || "USD").trim().toUpperCase();
export const MAX_QUANTITY = 10;
/** A sanity ceiling, so an odd request cannot create a four-figure order. */
export const MAX_TOTAL_CENTS = 50000;

/** "$10" or "$3.50" → 1000 or 350. Anything unreadable is not sellable. */
export function priceToCents(price) {
  const match = /(\d{1,6}(?:\.\d{1,2})?)/.exec(String(price ?? ""));
  if (!match) return null;
  const cents = Math.round(Number(match[1]) * 100);
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

/** A "/ week" run is still paid once; only the wording changes. */
function termOf(unit) {
  const text = String(unit ?? "").toLowerCase();
  if (text.includes("week")) return { term: "week" };
  if (text.includes("month")) return { term: "month" };
  return { term: "once" };
}

const CATALOG = new Map();
for (const item of servicesConfig.items) {
  const cents = priceToCents(item.price);
  if (cents === null) continue;
  CATALOG.set(item.id, {
    id: item.id,
    name: item.name,
    unit: item.unit,
    cents,
    ...termOf(item.unit),
  });
}

export function catalogEntry(id) {
  return CATALOG.get(id);
}

export function catalogIds() {
  return [...CATALOG.keys()];
}

export function dollars(cents) {
  return (cents / 100).toFixed(2);
}

/**
 * Turns a browser-supplied list into priced lines, or into a sentence to show
 * the buyer. Everything that costs money is decided here, never on the client.
 */
export function priceCart(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: "There is nothing to pay for yet." };
  }
  if (rawItems.length > 20) {
    return { error: "That is more options than one checkout can hold." };
  }

  const lines = [];
  for (const raw of rawItems) {
    const id = typeof raw?.id === "string" ? raw.id : "";
    const entry = CATALOG.get(id);
    if (!entry) return { error: "One of those options is not something we sell." };

    const qty = Number(raw?.qty ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
      return { error: `Pick between 1 and ${MAX_QUANTITY} of ${entry.name}.` };
    }

    const existing = lines.find((line) => line.id === id);
    if (existing) {
      existing.qty += qty;
      if (existing.qty > MAX_QUANTITY) {
        return { error: `Pick between 1 and ${MAX_QUANTITY} of ${entry.name}.` };
      }
    } else {
      lines.push({ ...entry, qty });
    }
  }

  const totalCents = lines.reduce((sum, line) => sum + line.cents * line.qty, 0);
  if (totalCents <= 0) return { error: "That total does not work out." };
  if (totalCents > MAX_TOTAL_CENTS) {
    return { error: "That is more than this checkout can take in one go — email us and we will invoice it." };
  }

  return { lines, totalCents };
}

export function paypalClientId() {
  return (process.env.PAYPAL_CLIENT_ID || "").trim();
}

function paypalClientSecret() {
  return (process.env.PAYPAL_CLIENT_SECRET || "").trim();
}

export function paypalEnvironment() {
  const name = (process.env.PAYPAL_ENV || "sandbox").trim().toLowerCase();
  return name === "production" || name === "live"
    ? Environment.Production
    : Environment.Sandbox;
}

export function paypalEnvironmentName() {
  return paypalEnvironment() === Environment.Production ? "production" : "sandbox";
}

/** True once both keys are in place. Nothing here is ever sent to a browser. */
export function paypalConfigured() {
  return Boolean(paypalClientId() && paypalClientSecret());
}

let cached = null;

/**
 * The Orders v2 controller, kept between warm invocations of the same function.
 * Null until both keys are in the deployment's environment variables.
 */
export function ordersController() {
  if (!paypalConfigured()) return null;
  if (cached && cached.clientId === paypalClientId()) return cached.orders;
  const client = new Client({
    environment: paypalEnvironment(),
    clientCredentialsAuthCredentials: {
      oAuthClientId: paypalClientId(),
      oAuthClientSecret: paypalClientSecret(),
    },
  });
  const orders = new OrdersController(client);
  cached = { clientId: paypalClientId(), orders };
  return orders;
}

/** The order body for PayPal Orders v2, built from priced lines only. */
export function orderBody(lines, totalCents) {
  return {
    intent: CheckoutPaymentIntent.Capture,
    purchaseUnits: [
      {
        amount: {
          currencyCode: CURRENCY,
          value: dollars(totalCents),
          breakdown: {
            itemTotal: { currencyCode: CURRENCY, value: dollars(totalCents) },
          },
        },
        description: "Boost from a launched sites directory".slice(0, 127),
        customId: lines.map((line) => `${line.id}:${line.qty}`).join("|").slice(0, 127),
        items: lines.map((line) => ({
          name: line.name.slice(0, 127),
          description: line.term === "once" ? "One-off" : `One ${line.term}`,
          quantity: String(line.qty),
          category: "DIGITAL_GOODS",
          unitAmount: { currencyCode: CURRENCY, value: dollars(line.cents) },
        })),
      },
    ],
    applicationContext: {
      shippingPreference: "NO_SHIPPING",
      userAction: "PAY_NOW",
    },
  };
}

export function jsonResponse(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-robots-tag", "noindex");
  res.end(JSON.stringify(body));
}

export function methodNotAllowed(res, allow) {
  res.setHeader("allow", allow);
  jsonResponse(res, 405, { error: "method_not_allowed" });
}

/**
 * Mutating requests only from our own pages. A missing origin (curl, a probe)
 * is allowed only when the browser did not mark the request as cross-site.
 */
export function isSameOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return String(req.headers?.["sec-fetch-site"] || "") !== "cross-site";
  const host = req.headers?.host;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function jsonBody(req) {
  const body = req.body;
  if (body && typeof body === "object") return body;
  if (typeof body === "string" && body.trim()) {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString("utf8"));
    } catch {
      return {};
    }
  }
  return {};
}

/** PayPal's own words, for the server log only. */
export function describePayPalError(error) {
  if (error instanceof ApiError) {
    const issues = Array.isArray(error.result?.details)
      ? error.result.details.map((detail) => detail?.issue).filter(Boolean).join(", ")
      : "";
    return `ApiError ${error.statusCode}${issues ? ` (${issues})` : ""}: ${
      error.result?.message || error.message
    }`;
  }
  return error instanceof Error ? error.message : String(error);
}

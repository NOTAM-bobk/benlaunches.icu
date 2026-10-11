/**
 * Checkout copy and money helpers.
 *
 * The words live in `config/checkout.json` and the prices in
 * `config/services.json`, so both are config edits rather than code changes.
 */
import checkoutJson from "../../config/checkout.json";
import { serviceConfig, type ServiceItem } from "./siteData";

export interface CheckoutContact {
  label: string;
  email: string;
  phone: string;
  note: string;
}

export interface CheckoutCopy {
  eyebrow: string;
  title: string;
  intro: string;
  currency: string;
  contact: CheckoutContact;
  promises: string[];
  offline: { title: string; body: string; emailAction: string };
  success: {
    eyebrow: string;
    contactLabel: string;
    title: string;
    intro: string;
    steps: string[];
  };
}

export const checkoutCopy = checkoutJson as CheckoutCopy;

/** "$10" or "$3.50" → 1000 or 350. Unreadable prices are not sellable. */
export function priceCents(price: string): number | null {
  const match = /(\d{1,6}(?:\.\d{1,2})?)/.exec(price ?? "");
  if (!match) return null;
  const cents = Math.round(Number(match[1]) * 100);
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: checkoutCopy.currency || "USD",
  }).format(cents / 100);
}

/** Everything with a price we can read, in the order the config lists it. */
export const sellableServices: ServiceItem[] = serviceConfig.items.filter(
  (item) => priceCents(item.price) !== null,
);

export function sellableById(id: string): ServiceItem | undefined {
  return sellableServices.find((item) => item.id === id);
}

export interface CheckoutLine {
  item: ServiceItem;
  qty: number;
  cents: number;
  totalCents: number;
}

export function lineFor(id: string, qty: number): CheckoutLine | null {
  const item = sellableById(id);
  const cents = item ? priceCents(item.price) : null;
  if (!item || cents === null) return null;
  const count = Math.min(10, Math.max(1, Math.round(qty) || 1));
  return { item, qty: count, cents, totalCents: cents * count };
}

export function totalCents(lines: CheckoutLine[]): number {
  return lines.reduce((sum, line) => sum + line.totalCents, 0);
}

/** "hello@base31.org" → "mailto:hello@base31.org". */
export function contactMailto(copy: CheckoutCopy): string {
  return `mailto:${copy.contact.email}`;
}

/** "612 444 3853" → "tel:6124443853". */
export function contactTel(copy: CheckoutCopy): string {
  return `tel:${copy.contact.phone.replace(/[^\d+]/g, "")}`;
}

/** What PayPal hands back after a capture, remembered so the success page can show it. */
export interface PaidOrder {
  status: string;
  orderId: string;
  captureId: string;
  paidAt: string;
  currency: string;
  total: string;
  payer: { name: string; email: string };
  items: { name: string; quantity: number; unitAmount: string }[];
  amountMatchesItems: boolean;
}

const LAST_ORDER_KEY = "boring-internet.last-order";

/** Kept for this tab only: a receipt should not outlive the session. */
export function rememberOrder(order: PaidOrder) {
  try {
    window.sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    // Private browsing can refuse storage; the page still works from route state.
  }
}

export function recallOrder(): PaidOrder | null {
  try {
    const raw = window.sessionStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return null;
    const order = JSON.parse(raw) as PaidOrder;
    return typeof order?.orderId === "string" ? order : null;
  } catch {
    return null;
  }
}

/** An amount straight from PayPal, e.g. "3.00" + "USD" → "$3.00". */
export function formatMoney(value: string, currency: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${value} ${currency}`.trim();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

export function formatPaidAt(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

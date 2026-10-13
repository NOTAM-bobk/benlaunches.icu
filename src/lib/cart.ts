/**
 * The little basket behind the checkout page.
 *
 * It holds ids and quantities only — never prices. Every amount is worked out
 * from `config/services.json`, and the server re-prices the basket before it
 * talks to PayPal, so a fiddled-with browser cannot change what something costs.
 */
import { useSyncExternalStore } from "react";

export interface CartEntry {
  id: string;
  qty: number;
}

const STORAGE_KEY = "boring-internet.cart.v1";
const MAX_QTY = 10;

function read(): CartEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => entry as Partial<CartEntry>)
      .filter((entry): entry is CartEntry => typeof entry.id === "string" && entry.id !== "")
      .map((entry) => ({
        id: entry.id,
        qty: Math.min(MAX_QTY, Math.max(1, Math.round(Number(entry.qty) || 1))),
      }));
  } catch {
    return [];
  }
}

let entries: CartEntry[] = read();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function commit(next: CartEntry[]) {
  entries = next;
  try {
    if (next.length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // A browser with storage switched off still gets a working basket for this page.
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current basket. The same array comes back until it actually changes. */
export function getCart(): CartEntry[] {
  return entries;
}

/** Live basket for a component. */
export function useCart(): CartEntry[] {
  return useSyncExternalStore(subscribe, getCart, getCart);
}

export function cartQuantity(): number {
  return entries.reduce((sum, entry) => sum + entry.qty, 0);
}

export function addToCart(id: string, qty = 1) {
  const existing = entries.find((entry) => entry.id === id);
  const next = existing
    ? entries.map((entry) =>
        entry.id === id ? { ...entry, qty: Math.min(MAX_QTY, entry.qty + qty) } : entry,
      )
    : [...entries, { id, qty: Math.min(MAX_QTY, Math.max(1, qty)) }];
  commit(next);
}

export function setCartQuantity(id: string, qty: number) {
  if (qty < 1) {
    removeFromCart(id);
    return;
  }
  commit(
    entries.map((entry) => (entry.id === id ? { ...entry, qty: Math.min(MAX_QTY, qty) } : entry)),
  );
}

export function removeFromCart(id: string) {
  commit(entries.filter((entry) => entry.id !== id));
}

export function clearCart() {
  commit([]);
}

export { MAX_QTY as MAX_CART_QUANTITY };

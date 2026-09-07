import { get, set } from "idb-keyval";

// idb-keyval instead of RxDB: this app only ever needs to cache one thing
// (the last good market-state response per watchlist) and queue one kind
// of pending action (add/remove symbol). RxDB is built for real
// multi-collection sync with conflict resolution between concurrent writers
// - genuinely the right tool if this grew into a multi-device, always-syncing
// app, but that's more machinery than a 72-hour build needs. Worth
// revisiting if "offline support" becomes a bigger part of the product.

export type CachedState = {
  payload: unknown; // the raw /market/state response body
  cachedAt: number;
};

function cacheKey(watchlistId: string) {
  return `state:${watchlistId}`;
}

export async function cacheState(watchlistId: string, payload: unknown) {
  const entry: CachedState = { payload, cachedAt: Date.now() };
  await set(cacheKey(watchlistId), entry);
}

export async function readCachedState(watchlistId: string): Promise<CachedState | undefined> {
  return get(cacheKey(watchlistId));
}

// Alerts get the same treatment as market state - if the backend's
// unreachable, the alerts panel should still show what you last knew
// instead of going blank, same principle as everything else in offline/.
const ALERTS_KEY = "alerts:list";

export async function cacheAlerts(payload: unknown) {
  await set(ALERTS_KEY, { payload, cachedAt: Date.now() });
}
export async function readCachedAlerts(): Promise<CachedState | undefined> {
  return get(ALERTS_KEY);
}

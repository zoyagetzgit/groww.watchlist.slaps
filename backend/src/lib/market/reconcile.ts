import { getFeedReadings } from "./engine.js";

export type Confidence = "LIVE" | "STALE" | "CONFLICT";

export type Reconciled = {
  price: number;
  confidence: Confidence;
  spreadPct: number;
  staleSeconds: number;
};

// Thresholds from the spec: nothing fresher than 3s = STALE, feeds
// disagreeing by >1.5% = CONFLICT.
const STALE_AFTER_MS = 3000;
const CONFLICT_SPREAD = 0.015;

// Feed A is the primary realtime source; B and C are secondary/delayed
// corroborators. That distinction matters for the confidence rule below:
// a single surviving secondary feed is NOT enough to call a price "LIVE",
// because there's nothing left to check it against. Without that rule, a
// corrupted Feed B on its own would get reported as verified-live data -
// exactly the failure this whole layer exists to prevent.
export function reconcile(symbol: string): Reconciled {
  const readings = getFeedReadings(symbol);
  const now = Date.now();

  const isFresh = (r: { ts: number } | null) => r !== null && now - r.ts <= STALE_AFTER_MS;
  const fresh = Object.values(readings).filter((r): r is NonNullable<typeof r> => isFresh(r));
  const primaryIsFresh = isFresh(readings.A);

  if (fresh.length === 0) {
    const anyReading = Object.values(readings).find((r): r is NonNullable<typeof r> => r !== null);
    if (!anyReading) return { price: 0, confidence: "STALE", spreadPct: 0, staleSeconds: 9999 };
    return {
      price: anyReading.price,
      confidence: "STALE",
      spreadPct: 0,
      staleSeconds: Math.round((now - anyReading.ts) / 1000),
    };
  }

  const prices = fresh.map((r) => r.price).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  const spread = (Math.max(...prices) - Math.min(...prices)) / median;
  const newestAgeSec = Math.round((now - Math.max(...fresh.map((r) => r.ts))) / 1000);

  // Order matters. Disagreement is the most useful thing to surface, so
  // it's checked first. Losing the primary feed comes next - we may still
  // have a number, but nothing corroborates it, so it isn't "LIVE".
  let confidence: Confidence;
  if (fresh.length > 1 && spread > CONFLICT_SPREAD) {
    confidence = "CONFLICT";
  } else if (!primaryIsFresh) {
    confidence = "STALE";
  } else {
    confidence = "LIVE";
  }

  return { price: median, confidence, spreadPct: spread, staleSeconds: newestAgeSec };
}
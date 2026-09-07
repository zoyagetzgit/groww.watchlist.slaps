import { getFeedReadings } from "./engine.js";

export type Confidence = "LIVE" | "STALE" | "CONFLICT";

export type Reconciled = {
  price: number;
  confidence: Confidence;
  spreadPct: number;
  staleSeconds: number;
};

// Thresholds straight from the spec: >3s with no fresh reading = STALE,
// >1.5% disagreement between feeds = CONFLICT. Conflict is checked before
// staleness because a live-but-disagreeing pair of feeds is a more useful
// thing to tell the user about than "everything's fine but old."
const STALE_AFTER_MS = 3000;
const CONFLICT_SPREAD = 0.015;

export function reconcile(symbol: string): Reconciled {
  const readings = getFeedReadings(symbol);
  const now = Date.now();

  const fresh = Object.values(readings).filter(
    (r): r is NonNullable<typeof r> => r !== null && now - r.ts <= STALE_AFTER_MS
  );

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

  const confidence: Confidence = spread > CONFLICT_SPREAD && fresh.length > 1 ? "CONFLICT" : "LIVE";
  const newestAgeSec = Math.round((now - Math.max(...fresh.map((r) => r.ts))) / 1000);

  return { price: median, confidence, spreadPct: spread, staleSeconds: newestAgeSec };
}

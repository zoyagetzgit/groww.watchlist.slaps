import { computeMCS, type MCSResult } from "./market/mcs.js";
import { detectContagion, type ContagionEvent } from "./market/contagion.js";

export type SnapshotEntry = { price: number; score: number; capturedAt: number };
export type Snapshot = Record<string, SnapshotEntry>;

export type ChangeCard = MCSResult & {
  reason: "new" | "newly_meaningful" | "reversed" | "moved";
  priorPrice?: number;
  priorScore?: number;
};

const MEANINGFUL_SCORE = 55;
const MOVE_SINCE_VISIT_THRESHOLD = 0.008; 


export function diffAgainstSnapshot(
  symbols: string[],
  snapshot: Snapshot | null,
  dismissedCatalystIds: string[]
): {
  all: MCSResult[];
  changes: ChangeCard[];
  contagionEvents: ContagionEvent[];
  newSnapshot: Snapshot;
} {
  const all = symbols.map((sym) => computeMCS(sym, dismissedCatalystIds));

  // run contagion detection BEFORE building individual change cards, so
  // symbols swept into a sector event don't also show up as their own card -
  // that's the actual "no spam feed" behaviour, not just labeling
  const { events: contagionEvents, consumedSymbols } = detectContagion(all);

  const newSnapshot: Snapshot = {};
  const changes: ChangeCard[] = [];

  for (const current of all) {
    newSnapshot[current.symbol] = { price: current.price, score: current.score, capturedAt: Date.now() };

    if (consumedSymbols.has(current.symbol)) continue; // covered by a contagion card instead

    const prior = snapshot?.[current.symbol];
    if (!prior) {
      changes.push({ ...current, reason: "new" });
      continue;
    }

    const priceDelta = prior.price > 0 ? (current.price - prior.price) / prior.price : 0;
    const flipped =
      Math.abs(priceDelta) > 0.001 &&
      Math.sign(current.changePct) !== 0 &&
      Math.sign(priceDelta) !== Math.sign(current.changePct);

    if (current.score >= MEANINGFUL_SCORE && prior.score < MEANINGFUL_SCORE) {
      changes.push({ ...current, reason: "newly_meaningful", priorPrice: prior.price, priorScore: prior.score });
    } else if (flipped && current.score >= 35) {
      changes.push({ ...current, reason: "reversed", priorPrice: prior.price, priorScore: prior.score });
    } else if (Math.abs(priceDelta) > MOVE_SINCE_VISIT_THRESHOLD) {
      changes.push({ ...current, reason: "moved", priorPrice: prior.price, priorScore: prior.score });
    }
  }

  changes.sort((a, b) => b.score - a.score);
  return { all: [...all].sort((a, b) => b.score - a.score), changes, contagionEvents, newSnapshot };
}

import { findSymbol } from "./universe.js";
import { getTrueState } from "./engine.js";
import { reconcile, type Confidence } from "./reconcile.js";
import { getCatalyst } from "./catalysts.js";

export type MCSResult = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  confidence: Confidence;
  staleSeconds: number;
  score: number; // 0-100, this is the MCS
  changePct: number;
  catalyst: { id: string; message: string; severity: "info" | "high" } | null;
  explanation: string;
};

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}
function stdDev(xs: number[]) {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) || 1e-9;
}
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

// The brief's formula:
//   MCS = w1(ΔPrice) x w2(Volume/AvgVolume) x w3(VolatilitySpike) + w4(UnreadCatalyst)
//
// I implemented this as a literal multiplication of three 0-1 components,
// not three independently-weighted additive terms - on purpose. Multiplying
// means all three have to be at least somewhat elevated for the score to
// climb. That's exactly the brief's own example: "a 2% move on zero volume
// means nothing." In an additive model, a huge price move still contributes
// a big chunk of score even at zero volume. In a multiplicative model, the
// zero-volume term collapses the whole product toward zero, which is what
// should happen to a move nobody actually traded on.
//
// The catalyst term stays additive on purpose - a catalyst is a
// forward-looking flag, not a confirmation of a price move, so it shouldn't
// need the other three to already be elevated to matter.
export function computeMCS(symbol: string, dismissedCatalystIds: string[]): MCSResult {
  const profile = findSymbol(symbol);
  const s = getTrueState(symbol);
  const quote = reconcile(symbol);

  if (!profile || !s) {
    return {
      symbol,
      name: symbol,
      sector: "",
      price: 0,
      confidence: "STALE",
      staleSeconds: 9999,
      score: 0,
      changePct: 0,
      catalyst: null,
      explanation: "No data for this symbol.",
    };
  }

  const allReturns = s.returns.map((r) => r.logReturn);
  const longWindow = allReturns.slice(-30);
  const shortWindow = allReturns.slice(-5);
  const longVol = stdDev(longWindow) || profile.dailyVolPct;
  const shortVol = stdDev(shortWindow) || longVol;
  const latestReturn = allReturns[allReturns.length - 1] ?? 0;

  // w1: ΔPrice, expressed relative to the stock's own normal volatility
  // (same reasoning as v1: a move only "counts" relative to what's normal
  // for THIS stock, not a flat percentage)
  const zScore = latestReturn / longVol;
  const priceComponent = clamp01(Math.abs(zScore) / 3);

  // w2: current volume vs average - the brief's own example uses 4x as the
  // notable threshold, so that's where this saturates to 1
  const avgVolume = mean(s.recentVolumes.slice(0, -1)) || 1;
  const latestVolume = s.recentVolumes[s.recentVolumes.length - 1] ?? avgVolume;
  const volumeRatio = latestVolume / avgVolume;
  const volumeComponent = clamp01(volumeRatio / 4);

  // w3: technical volatility spike - is this stock suddenly choppier than
  // its own recent history, independent of direction
  const volSpikeComponent = clamp01(shortVol / longVol - 1);

  const core = priceComponent * volumeComponent * volSpikeComponent; // 0-1, multiplicative

  const catalyst = getCatalyst(symbol);
  const catalystActive = catalyst !== null && !dismissedCatalystIds.includes(catalyst.id);

  const CORE_WEIGHT = 85; // max points the price/volume/volatility combo can contribute
  const CATALYST_WEIGHT = 25; // a catalyst alone can push a quiet stock into "worth a look"

  const score = Math.round(Math.min(100, core * CORE_WEIGHT + (catalystActive ? CATALYST_WEIGHT : 0)));
  const changePct = ((s.price - profile.basePrice) / profile.basePrice) * 100;

  return {
    symbol,
    name: profile.name,
    sector: profile.sector,
    price: quote.price,
    confidence: quote.confidence,
    staleSeconds: quote.staleSeconds,
    score,
    changePct,
    catalyst: catalystActive ? catalyst : null,
    explanation: explain({ zScore, volumeRatio, volSpikeComponent, catalystActive, catalyst, changePct, confidence: quote.confidence }),
  };
}

function explain(args: {
  zScore: number;
  volumeRatio: number;
  volSpikeComponent: number;
  catalystActive: boolean;
  catalyst: { message: string } | null;
  changePct: number;
  confidence: Confidence;
}): string {
  const { zScore, volumeRatio, volSpikeComponent, catalystActive, catalyst, changePct, confidence } = args;
  const dir = changePct >= 0 ? "up" : "down";

  if (confidence === "CONFLICT") return "Feeds disagree on the price right now - showing the median until they settle.";
  if (confidence === "STALE") return "Feed hasn't updated recently - showing the last known price.";

  if (catalystActive && Math.abs(zScore) < 1) {
    return `${catalyst?.message} - nothing's moved yet, but worth knowing.`;
  }
  if (Math.abs(zScore) >= 2 && volumeRatio >= 2) {
    return `Moving ${Math.abs(zScore).toFixed(1)}x its normal swing on ${volumeRatio.toFixed(1)}x volume - ${dir} ${Math.abs(changePct).toFixed(1)}%.`;
  }
  if (volSpikeComponent > 0.4) {
    return `Choppier than usual right now, ${dir} ${Math.abs(changePct).toFixed(1)}%.`;
  }
  if (Math.abs(zScore) >= 1.5) {
    return `${dir === "up" ? "Up" : "Down"} ${Math.abs(changePct).toFixed(1)}%, a bit more than its normal move.`;
  }
  return `${dir === "up" ? "Up" : "Down"} ${Math.abs(changePct).toFixed(1)}% - within its normal range.`;
}

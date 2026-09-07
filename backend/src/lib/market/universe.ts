// Same made-up-but-plausible Indian large/mid-cap universe as before, now
// with a `sector` tag. The sector is what lets contagion.ts tell the
// difference between "4 unrelated stocks happened to move" and "4 IT
// stocks moved together because something IT-wide happened."
//
// dailyVolPct = roughly how much this stock normally moves in a session.
// avgVolume   = a made-up baseline used for the volume-spike part of MCS.

export type Sector = "IT" | "Banking" | "Auto" | "Energy" | "Consumer" | "Conglomerate";

export type SymbolProfile = {
  symbol: string;
  name: string;
  sector: Sector;
  basePrice: number;
  dailyVolPct: number;
  avgVolume: number;
};

export const UNIVERSE: SymbolProfile[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", basePrice: 2950, dailyVolPct: 0.011, avgVolume: 6_200_000 },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", basePrice: 4120, dailyVolPct: 0.009, avgVolume: 2_100_000 },
  { symbol: "INFY", name: "Infosys", sector: "IT", basePrice: 1890, dailyVolPct: 0.012, avgVolume: 5_400_000 },
  { symbol: "WIPRO", name: "Wipro", sector: "IT", basePrice: 545, dailyVolPct: 0.013, avgVolume: 7_100_000 },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", basePrice: 1685, dailyVolPct: 0.010, avgVolume: 9_800_000 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking", basePrice: 825, dailyVolPct: 0.015, avgVolume: 14_500_000 },
  { symbol: "ITC", name: "ITC Limited", sector: "Consumer", basePrice: 465, dailyVolPct: 0.008, avgVolume: 11_000_000 },
  { symbol: "ZOMATO", name: "Zomato", sector: "Consumer", basePrice: 285, dailyVolPct: 0.026, avgVolume: 28_000_000 },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto", basePrice: 990, dailyVolPct: 0.021, avgVolume: 12_300_000 },
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate", basePrice: 3120, dailyVolPct: 0.028, avgVolume: 3_900_000 },
];

// what shows up in the contagion card's explanation, per sector. Picked
// pseudo-randomly (but deterministically per event) - see contagion.ts.
// This is a heuristic guess at a plausible cause, NOT a real news lookup -
// said out loud in the UI copy and in DECISIONS, because pretending
// otherwise would be the kind of thing that falls apart under a judge's
// second question.
export const PLAUSIBLE_CAUSES: Record<Sector, string[]> = {
  IT: ["a sharp move in the USD/INR rate", "weak overnight US tech earnings", "a broad IT sector selloff"],
  Banking: ["RBI policy commentary", "a jump in bond yields", "sector-wide profit booking"],
  Auto: ["a swing in crude oil prices", "weaker-than-expected monthly sales numbers", "rising input costs"],
  Energy: ["crude oil price movement", "global energy demand news"],
  Consumer: ["rural demand commentary", "input cost inflation concerns"],
  Conglomerate: ["broad market risk-off sentiment", "a large block deal"],
};

export function findSymbol(symbol: string): SymbolProfile | undefined {
  return UNIVERSE.find((s) => s.symbol === symbol.toUpperCase());
}

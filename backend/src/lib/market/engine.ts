import { UNIVERSE, findSymbol, type Sector } from "./universe.js";

// Same reasoning as the first version: no free live market API I'd trust to
// stay up during a 5-minute demo on unknown wifi, so this simulates what a
// real multi-vendor feed setup looks like - noise, lag, occasional dropout -
// and everything downstream (reconcile, mcs, contagion) only ever talks to
// this module through getFeedReadings() and getTrueState(). Swap this file
// out for a real exchange feed later and nothing else needs to change.
//
// One thing this version adds over the first draft: symbols now share a
// small "sector shock" each tick, on top of their own private noise. That's
// what makes the contagion detector (contagion.ts) have something real to
// find, instead of only ever seeing coincidences.

type FeedName = "A" | "B" | "C";
type Reading = { price: number; ts: number } | null;

type ReturnPoint = { logReturn: number; ts: number };

type SymbolState = {
  price: number;
  lastTickAt: number;
  returns: ReturnPoint[]; // rolling, most recent last
  recentVolumes: number[];
  sessionHigh: number;
  sessionLow: number;
  quietStreak: number;
};

type ChaosState = {
  disconnectA: boolean;
  garbageB: boolean;
  latencyMs: number;
  forcedSectorShock: { sector: Sector; direction: 1 | -1 } | null;
};

const g = globalThis as unknown as {
  __marketState?: Map<string, SymbolState>;
  __chaos?: ChaosState;
};

function state(): Map<string, SymbolState> {
  if (!g.__marketState) {
    const m = new Map<string, SymbolState>();
    const now = Date.now();
    for (const s of UNIVERSE) {
      m.set(s.symbol, {
        price: s.basePrice,
        lastTickAt: now,
        returns: seedReturns(s.dailyVolPct, now),
        recentVolumes: seedVolumes(s.avgVolume),
        sessionHigh: s.basePrice,
        sessionLow: s.basePrice,
        quietStreak: 0,
      });
    }
    g.__marketState = m;
  }
  return g.__marketState;
}

function chaos(): ChaosState {
  if (!g.__chaos) g.__chaos = { disconnectA: false, garbageB: false, latencyMs: 0, forcedSectorShock: null };
  return g.__chaos;
}

export function setChaos(patch: Partial<ChaosState>) {
  g.__chaos = { ...chaos(), ...patch };
}
export function getChaos(): ChaosState {
  return chaos();
}
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function seedReturns(dailyVolPct: number, now: number): ReturnPoint[] {
  return Array.from({ length: 25 }, (_, i) => ({
    logReturn: gaussian() * dailyVolPct,
    ts: now - (25 - i) * 60_000,
  }));
}
function seedVolumes(avg: number): number[] {
  return Array.from({ length: 20 }, () => avg * (0.7 + Math.random() * 0.6));
}

function gaussian(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// per-sector shared shock so correlated moves actually happen sometimes,
// not just independent random walks that occasionally line up by luck
const sectorShockCache = new Map<Sector, { value: number; expiresAt: number }>();
function sectorShock(sector: Sector): number {
  const forced = chaos().forcedSectorShock;
  if (forced && forced.sector === sector) {
    return forced.direction * (2.5 + Math.random());
  }
  const cached = sectorShockCache.get(sector);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  // small chance of a real correlated move every ~20s window, otherwise ~0
  const value = Math.random() < 0.12 ? gaussian() * 1.4 : gaussian() * 0.15;
  sectorShockCache.set(sector, { value, expiresAt: now + 20_000 });
  return value;
}

function advance(symbol: string) {
  const profile = findSymbol(symbol);
  const s = state().get(symbol);
  if (!profile || !s) return;

  const now = Date.now();
  const elapsedSec = (now - s.lastTickAt) / 1000;
  if (elapsedSec < 1) return;

  const steps = Math.max(1, Math.floor(Math.min(elapsedSec / 3, 40)));
  const stepVol = profile.dailyVolPct / Math.sqrt(6.5 * 3600);
  const shockThisSymbol = sectorShock(profile.sector) * stepVol * 8; // shared component

  let logReturn = shockThisSymbol;
  for (let i = 0; i < steps; i++) {
    logReturn += gaussian() * stepVol * Math.sqrt(3);
  }

  const newPrice = s.price * Math.exp(logReturn);
  s.returns.push({ logReturn, ts: now });
  if (s.returns.length > 80) s.returns.shift();

  const volume = profile.avgVolume * (0.5 + Math.random() * 1.3) * (1 + Math.abs(logReturn) * 15);
  s.recentVolumes.push(volume);
  if (s.recentVolumes.length > 20) s.recentVolumes.shift();

  s.price = newPrice;
  s.sessionHigh = Math.max(s.sessionHigh, newPrice);
  s.sessionLow = Math.min(s.sessionLow, newPrice);
  s.quietStreak = Math.abs(logReturn) < profile.dailyVolPct * 0.15 ? s.quietStreak + 1 : 0;
  s.lastTickAt = now;
}

export function getTrueState(symbol: string): SymbolState | undefined {
  advance(symbol);
  return state().get(symbol);
}

// Three feeds, matching the "2-3 dummy market feeds" spec. A is the fast
// one, B is the one that gets asked to misbehave, C runs a little behind on
// purpose so staleness logic has something to chew on even with no chaos on.
export function getFeedReadings(symbol: string): Record<FeedName, Reading> {
  const s = getTrueState(symbol);
  const c = chaos();
  const now = Date.now();
  if (!s) return { A: null, B: null, C: null };

  const A: Reading = c.disconnectA ? null : { price: jitter(s.price, 0.0006), ts: now };

  const B: Reading = c.garbageB
    ? { price: s.price * (0.5 + Math.random()), ts: now } // wildly wrong on purpose
    : { price: jitter(s.price, 0.0012), ts: now - randomInt(0, 800) };

  const C: Reading = { price: jitter(s.price, 0.002), ts: now - randomInt(1500, 4000) };

  return { A, B, C };
}

function jitter(price: number, pct: number) {
  return price * (1 + gaussian() * pct);
}
function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min));
}

export type { FeedName, Reading, SymbolState, ReturnPoint };

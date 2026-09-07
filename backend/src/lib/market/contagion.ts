import { findSymbol, PLAUSIBLE_CAUSES, type Sector } from "./universe.js";
import type { MCSResult } from "./mcs.js";

export type ContagionEvent = {
  sector: Sector;
  direction: "up" | "down";
  affectedSymbols: string[];
  totalInSector: number; // how many symbols from this sector are on the watchlist at all
  avgChangePct: number;
  cause: string;
};

// deterministic-per-minute pick so the cause doesn't change on every poll
// mid-event, which would look buggy rather than "context-aware"
function pickCause(sector: Sector): string {
  const options = PLAUSIBLE_CAUSES[sector];
  const bucket = Math.floor(Date.now() / 60_000);
  return options[bucket % options.length];
}

const MOVE_THRESHOLD_Z = 1.2; // roughly matches computeMCS's own zScore scale, but we don't have z here directly
const MOVE_THRESHOLD_PCT = 0.9; // fallback: >0.9% counted as "moved" for contagion purposes
const MIN_SECTOR_SIZE = 2; // need at least 2 stocks from a sector on the list to call it a pattern
const AGREEMENT_RATIO = 0.6; // 60%+ of that sector's watchlist members moving the same way = contagion

// Groups per-symbol results by sector and looks for "most of this sector
// moved the same direction" instead of just eyeballing individual moves.
// Symbols that get folded into a contagion event are returned separately so
// the caller (diff.ts) can leave them OUT of the individual change feed -
// that's the actual deduplication, not just detecting the pattern.
export function detectContagion(results: MCSResult[]): {
  events: ContagionEvent[];
  consumedSymbols: Set<string>;
} {
  const bySector = new Map<Sector, MCSResult[]>();
  for (const r of results) {
    const profile = findSymbol(r.symbol);
    if (!profile) continue;
    const list = bySector.get(profile.sector) ?? [];
    list.push(r);
    bySector.set(profile.sector, list);
  }

  const events: ContagionEvent[] = [];
  const consumedSymbols = new Set<string>();

  for (const [sector, members] of bySector) {
    if (members.length < MIN_SECTOR_SIZE) continue;

    const movedUp = members.filter((m) => m.changePct > MOVE_THRESHOLD_PCT);
    const movedDown = members.filter((m) => m.changePct < -MOVE_THRESHOLD_PCT);

    const direction: "up" | "down" | null =
      movedUp.length / members.length >= AGREEMENT_RATIO
        ? "up"
        : movedDown.length / members.length >= AGREEMENT_RATIO
        ? "down"
        : null;

    if (!direction) continue;

    const affected = direction === "up" ? movedUp : movedDown;
    affected.forEach((m) => consumedSymbols.add(m.symbol));

    events.push({
      sector,
      direction,
      affectedSymbols: affected.map((m) => m.symbol),
      totalInSector: members.length,
      avgChangePct: affected.reduce((sum, m) => sum + m.changePct, 0) / affected.length,
      cause: pickCause(sector),
    });
  }

  return { events, consumedSymbols };
}

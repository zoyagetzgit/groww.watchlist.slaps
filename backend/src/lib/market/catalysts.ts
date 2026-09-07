import { findSymbol } from "./universe.js";

// Everything else in this app reacts to price. A catalyst is the one input
// that can matter BEFORE price moves - "earnings in 2 days" is worth
// knowing even on a dead-quiet session. These are mocked (no real corporate
// actions calendar wired up - see DECISIONS.md) but deterministic per
// symbol per day, so refreshing the page doesn't make one disappear and
// reappear at random, which would undercut the whole "unread" idea.

export type Catalyst = {
  id: string;
  symbol: string;
  message: string;
  severity: "info" | "high";
};

const TEMPLATES: Array<{ message: string; severity: Catalyst["severity"] }> = [
  { message: "Quarterly earnings due in 2 days", severity: "high" },
  { message: "Ex-dividend date is tomorrow", severity: "info" },
  { message: "Board meeting scheduled this week", severity: "info" },
  { message: "Approaching its 52-week high", severity: "high" },
];

// simple deterministic hash so the same symbol+day always produces the same
// (or no) catalyst, instead of a new random one every request
function pseudoRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

export function getCatalyst(symbol: string): Catalyst | null {
  if (!findSymbol(symbol)) return null;
  const day = new Date().toISOString().slice(0, 10);
  const roll = pseudoRandom(`${symbol}-${day}`);

  // roughly 35% of symbols have a live catalyst on a given day
  if (roll > 0.35) return null;

  const templateIndex = Math.floor(pseudoRandom(`${symbol}-${day}-t`) * TEMPLATES.length);
  const template = TEMPLATES[templateIndex];

  return {
    id: `${symbol}-${day}-catalyst`,
    symbol,
    message: template.message,
    severity: template.severity,
  };
}

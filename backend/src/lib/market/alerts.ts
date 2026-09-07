import type { PriceAlert } from "@prisma/client";
import { reconcile } from "./reconcile.js";

export type AlertEvaluation =
  | { outcome: "unchanged" }
  | { outcome: "triggered"; price: number }
  | { outcome: "expired" };

// The one rule that makes this more than a toy: an alert is only allowed to
// fire against a LIVE-confidence price. If Feed B is spitting garbage
// (CONFLICT) or nothing's answered in time (STALE), that's exactly the
// moment a naive implementation would fire a false trigger off a bad
// number - which for something modeled on a real trading feature is a
// worse failure than firing a few seconds late. Expiry, on the other hand,
// checks wall-clock time and doesn't care about feed confidence at all -
// there's no "untrustworthy" way to be past a TTL.
export function evaluateAlert(alert: PriceAlert, now: number): AlertEvaluation {
  if (now > alert.expiresAt.getTime()) {
    return { outcome: "expired" };
  }

  const quote = reconcile(alert.symbol);
  if (quote.confidence !== "LIVE") {
    return { outcome: "unchanged" };
  }

  const crossed =
    alert.direction === "above" ? quote.price >= alert.targetPrice : quote.price <= alert.targetPrice;

  if (!crossed) return { outcome: "unchanged" };
  return { outcome: "triggered", price: quote.price };
}

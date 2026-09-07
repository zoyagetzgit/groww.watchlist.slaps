import { get, set } from "idb-keyval";
import { apiFetch } from "../api";

// Generalized from the v1 version, which only knew about add/remove-symbol.
// Alerts need the exact same "don't lose the click if we're offline"
// treatment, so instead of a second parallel queue, this is one queue of
// tagged actions, replayed in order.

type WatchlistItemAction = { kind: "watchlist_item"; watchlistId: string; type: "add" | "remove"; symbol: string };
type AlertCreateAction = {
  kind: "alert_create";
  symbol: string;
  direction: "above" | "below";
  targetPrice: number;
  ttlDays: number;
};
type AlertCancelAction = { kind: "alert_cancel"; alertId: string };

type PendingAction = (WatchlistItemAction | AlertCreateAction | AlertCancelAction) & {
  id: string;
  createdAt: number;
};

const WAL_KEY = "wal:pending-actions";

async function readWAL(): Promise<PendingAction[]> {
  return (await get(WAL_KEY)) ?? [];
}
async function writeWAL(actions: PendingAction[]) {
  await set(WAL_KEY, actions);
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function queueWatchlistAction(watchlistId: string, type: "add" | "remove", symbol: string) {
  const actions = await readWAL();
  actions.push({ kind: "watchlist_item", watchlistId, type, symbol, id: newId(), createdAt: Date.now() });
  await writeWAL(actions);
}

export async function queueAlertCreate(symbol: string, direction: "above" | "below", targetPrice: number, ttlDays: number) {
  const actions = await readWAL();
  actions.push({ kind: "alert_create", symbol, direction, targetPrice, ttlDays, id: newId(), createdAt: Date.now() });
  await writeWAL(actions);
}

export async function queueAlertCancel(alertId: string) {
  const actions = await readWAL();
  actions.push({ kind: "alert_cancel", alertId, id: newId(), createdAt: Date.now() });
  await writeWAL(actions);
}

export async function pendingCount(): Promise<number> {
  return (await readWAL()).length;
}

// Same "stop at the first failure" logic as before - replaying out of
// order could mean an alert-cancel landing before its own alert-create.
export async function flushWAL(): Promise<{ succeeded: number; remaining: number }> {
  const actions = await readWAL();
  if (actions.length === 0) return { succeeded: 0, remaining: 0 };

  let succeeded = 0;
  const remaining = [...actions];

  while (remaining.length > 0) {
    const action = remaining[0];
    try {
      let res: Response;
      if (action.kind === "watchlist_item") {
        res = await apiFetch(`/watchlists/${action.watchlistId}/items`, {
          method: action.type === "add" ? "POST" : "DELETE",
          body: JSON.stringify({ symbol: action.symbol }),
        });
      } else if (action.kind === "alert_create") {
        res = await apiFetch("/alerts", {
          method: "POST",
          body: JSON.stringify({
            symbol: action.symbol,
            direction: action.direction,
            targetPrice: action.targetPrice,
            ttlDays: action.ttlDays,
          }),
        });
      } else {
        res = await apiFetch(`/alerts/${action.alertId}`, { method: "DELETE" });
      }

      if (!res.ok) break;
      remaining.shift();
      succeeded++;
    } catch {
      break;
    }
  }

  await writeWAL(remaining);
  return { succeeded, remaining: remaining.length };
}

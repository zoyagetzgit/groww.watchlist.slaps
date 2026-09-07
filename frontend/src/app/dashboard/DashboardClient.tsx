"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getName, clearSession } from "@/lib/auth";
import { cacheState, readCachedState, cacheAlerts, readCachedAlerts } from "@/lib/offline/db";
import {
  queueWatchlistAction,
  queueAlertCreate,
  queueAlertCancel,
  flushWAL,
  pendingCount as readPendingCount,
} from "@/lib/offline/sync";
import type { MarketStateResponse, Watchlist, PriceAlert } from "@/lib/types";

import MeaningfulChangeCard from "@/components/MeaningfulChangeCard";
import ChangesSinceLastVisit from "@/components/ChangesSinceLastVisit";
import AddSymbolBar from "@/components/AddSymbolBar";
import BreakItBar from "@/components/BreakItBar";

import AlertsPanel from "@/components/AlertsPanel";

const POLL_MS = 5000;

const EMPTY_STATE: MarketStateResponse = {
  all: [],
  changes: [],
  contagionEvents: [],
  newlyTriggeredAlerts: [],
  lastVisitedAt: null,
  hadPriorSnapshot: false,
  servedAt: 0,
};

export default function DashboardClient() {
  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [market, setMarket] = useState<MarketStateResponse>(EMPTY_STATE);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState<{ ageSec: number } | null>(null);
  const [pending, setPending] = useState(0);
  const hasCommitted = useRef(false);

  useEffect(() => {
    apiFetch("/watchlists")
      .then((r) => r.json())
      .then((data) => {
        if (data.watchlists?.length) setWatchlist(data.watchlists[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!watchlist) return;
    let cancelled = false;

    async function fetchState() {
      const commit = !hasCommitted.current;
      try {
        const res = await apiFetch(`/market/state?watchlistId=${watchlist!.id}&commit=${commit}`);
        if (!res.ok) throw new Error("bad status");
        const data: MarketStateResponse = await res.json();
        if (cancelled) return;

        await cacheState(watchlist!.id, data);
        setMarket(data);
        setDegraded(null);
        hasCommitted.current = true;

        const result = await flushWAL();
        if (result.succeeded > 0) setPending(await readPendingCount());
      } catch (err) {
        if (cancelled) return;
        const cached = await readCachedState(watchlist!.id);
        if (cached) {
          setMarket(cached.payload as MarketStateResponse);
          setDegraded({ ageSec: Math.round((Date.now() - cached.cachedAt) / 1000) });
        }
        void err;
      }
    }

    fetchState();
    const interval = setInterval(fetchState, POLL_MS);
    const onOnline = () => fetchState();
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
    };
  }, [watchlist]);

  // separate poll for alerts - lighter weight, doesn't need to be tied to
  // the watchlist's commit/snapshot cycle at all
  useEffect(() => {
    let cancelled = false;

    async function fetchAlerts() {
      try {
        const res = await apiFetch("/alerts");
        if (!res.ok) throw new Error("bad status");
        const data = await res.json();
        if (cancelled) return;
        await cacheAlerts(data.alerts);
        setAlerts(data.alerts);
      } catch {
        const cached = await readCachedAlerts();
        if (cached && !cancelled) setAlerts(cached.payload as PriceAlert[]);
      }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    readPendingCount().then(setPending);
  }, []);

  async function handleAdd(symbol: string) {
    if (!watchlist) return;
    setWatchlist({ ...watchlist, items: [...watchlist.items, { symbol }] });
    try {
      const res = await apiFetch(`/watchlists/${watchlist.id}/items`, { method: "POST", body: JSON.stringify({ symbol }) });
      if (!res.ok) throw new Error("rejected");
      const data = await res.json();
      setWatchlist(data.watchlist);
    } catch (err) {
      await queueWatchlistAction(watchlist.id, "add", symbol);
      setPending(await readPendingCount());
      void err;
    }
  }

  async function handleRemove(symbol: string) {
    if (!watchlist) return;
    setWatchlist({ ...watchlist, items: watchlist.items.filter((i) => i.symbol !== symbol) });
    setMarket((m) => ({ ...m, all: m.all.filter((a) => a.symbol !== symbol) }));
    try {
      const res = await apiFetch(`/watchlists/${watchlist.id}/items`, { method: "DELETE", body: JSON.stringify({ symbol }) });
      if (!res.ok) throw new Error("rejected");
    } catch (err) {
      await queueWatchlistAction(watchlist.id, "remove", symbol);
      setPending(await readPendingCount());
      void err;
    }
  }

  async function handleDismissCatalyst(catalystId: string) {
    if (!watchlist) return;
    setMarket((m) => ({
      ...m,
      all: m.all.map((item) => (item.catalyst?.id === catalystId ? { ...item, catalyst: null } : item)),
    }));
    try {
      await apiFetch(`/watchlists/${watchlist.id}/catalysts/dismiss`, { method: "POST", body: JSON.stringify({ catalystId }) });
    } catch {
      // low stakes - worst case the flag reappears on next refresh
    }
  }

  async function handleCreateAlert(symbol: string, direction: "above" | "below", targetPrice: number, ttlDays: number) {
    // optimistic placeholder so the alert shows up immediately - gets
    // replaced by the real row (with a real id) on the next /alerts poll
    const placeholder: PriceAlert = {
      id: `pending-${Date.now()}`,
      symbol,
      direction,
      targetPrice,
      status: "active",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlDays * 86_400_000).toISOString(),
      triggeredAt: null,
      triggeredPrice: null,
    };
    setAlerts((prev) => [placeholder, ...prev]);

    try {
      const res = await apiFetch("/alerts", {
        method: "POST",
        body: JSON.stringify({ symbol, direction, targetPrice, ttlDays }),
      });
      if (!res.ok) throw new Error("rejected");
    } catch (err) {
      await queueAlertCreate(symbol, direction, targetPrice, ttlDays);
      setPending(await readPendingCount());
      void err;
    }
  }

  async function handleCancelAlert(alertId: string) {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: "cancelled" } : a)));
    try {
      const res = await apiFetch(`/alerts/${alertId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("rejected");
    } catch (err) {
      await queueAlertCancel(alertId);
      setPending(await readPendingCount());
      void err;
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-surface grid place-items-center text-inkMuted text-sm">Loading your watchlist...</main>;
  }
  if (!watchlist) {
    return (
      <main className="min-h-screen bg-surface grid place-items-center text-inkMuted text-sm text-center px-6">
        Couldn&apos;t reach the backend. Make sure it&apos;s running on port 4000, then refresh.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="sticky top-0 z-20 bg-surface border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand grid place-items-center">
              <span className="text-white font-bold text-xs">W</span>
            </div>
            <span className="font-semibold text-ink text-sm">Watchlist</span>
          </div>
          <div className="flex items-center gap-4">
            
            <button onClick={() => { clearSession(); window.location.href = "/"; }} className="text-xs text-inkMuted hover:text-ink">
              {getName()} · Sign out
            </button>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 flex gap-2 pb-2">
          <span className="text-xs font-medium text-brand bg-brandSoft px-3 py-1 rounded-pill">{watchlist.name}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {degraded && (
          <div className="mb-4 text-xs bg-[#FDF3E3] text-[#B7791F] rounded-card px-3 py-2">
            Showing cached data from {degraded.ageSec}s ago - backend&apos;s unreachable, nothing&apos;s been lost.
          </div>
        )}
        {pending > 0 && (
          <div className="mb-4 text-xs bg-insightSoft text-insight rounded-card px-3 py-2">
            {pending} change{pending > 1 ? "s" : ""} queued, will sync once the connection&apos;s back.
          </div>
        )}

        <BreakItBar />

        <ChangesSinceLastVisit
          changes={market.changes}
          contagionEvents={market.contagionEvents}
          newlyTriggeredAlerts={market.newlyTriggeredAlerts}
          lastVisitedAt={market.lastVisitedAt}
          hadPriorSnapshot={market.hadPriorSnapshot}
        />

        <AlertsPanel alerts={alerts} onCreate={handleCreateAlert} onCancel={handleCancelAlert} />

        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-ink">Full list</h2>
            <AddSymbolBar existingSymbols={market.all.map((a) => a.symbol)} onAdd={handleAdd} />
          </div>
          <div>
            {market.all.map((item) => (
              <MeaningfulChangeCard
                key={item.symbol}
                item={item}
                onRemove={() => handleRemove(item.symbol)}
                onDismissCatalyst={handleDismissCatalyst}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

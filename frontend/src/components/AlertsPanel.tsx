"use client";

import { useState } from "react";
import { SYMBOLS } from "@/lib/universe";
import type { PriceAlert } from "@/lib/types";

const TTL_OPTIONS = [1, 3, 7, 30];

const STATUS_STYLE: Record<PriceAlert["status"], string> = {
  active: "bg-insightSoft text-insight",
  triggered: "bg-upSoft text-up",
  expired: "bg-staleSoft text-stale",
  cancelled: "bg-staleSoft text-stale",
};

function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}

export default function AlertsPanel({
  alerts,
  onCreate,
  onCancel,
}: {
  alerts: PriceAlert[];
  onCreate: (symbol: string, direction: "above" | "below", targetPrice: number, ttlDays: number) => void;
  onCancel: (alertId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState(SYMBOLS[0].symbol);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [target, setTarget] = useState("");
  const [ttl, setTtl] = useState(7);

  const visible = alerts.filter((a) => a.status !== "cancelled");

  function submit() {
    const price = Number(target);
    if (!Number.isFinite(price) || price <= 0) return;
    onCreate(symbol, direction, price, ttl);
    setTarget("");
    setOpen(false);
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-ink">Price alerts</h2>
        <button onClick={() => setOpen((v) => !v)} className="text-xs font-medium text-brand">
          {open ? "Cancel" : "+ New alert"}
        </button>
      </div>

      {open && (
        <div className="border border-border rounded-card p-3 mb-3 space-y-2">
          <div className="flex gap-2">
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="flex-1 border border-border rounded-card px-2 py-1.5 text-sm bg-surface">
              {SYMBOLS.map((s) => (
                <option key={s.symbol} value={s.symbol}>{s.symbol}</option>
              ))}
            </select>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "above" | "below")}
              className="border border-border rounded-card px-2 py-1.5 text-sm bg-surface"
            >
              <option value="above">crosses above</option>
              <option value="below">falls below</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Target price (₹)"
              inputMode="decimal"
              className="flex-1 border border-border rounded-card px-3 py-1.5 text-sm bg-surface"
            />
            <select value={ttl} onChange={(e) => setTtl(Number(e.target.value))} className="border border-border rounded-card px-2 py-1.5 text-sm bg-surface">
              {TTL_OPTIONS.map((d) => (
                <option key={d} value={d}>expires in {d}d</option>
              ))}
            </select>
          </div>
          <button onClick={submit} className="w-full bg-brand text-white text-sm font-medium rounded-card py-1.5">
            Set alert
          </button>
          <p className="text-[11px] text-inkMuted">
            Only fires against a live-confidence price - never off a stale or conflicting one.
          </p>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-xs text-inkMuted">No alerts set. Alerts here keep watching even after you close the tab.</p>
      ) : (
        <div className="space-y-1.5">
          {visible.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm border-b border-border py-2 last:border-0">
              <div>
                <span className="font-medium text-ink">{a.symbol}</span>
                <span className="text-inkMuted">
                  {" "}
                  {a.direction === "above" ? "≥" : "≤"} ₹{a.targetPrice.toFixed(2)}
                </span>
                {a.status === "triggered" && a.triggeredPrice != null && (
                  <span className="text-xs text-up block">hit ₹{a.triggeredPrice.toFixed(2)}</span>
                )}
                {a.status === "active" && <span className="text-xs text-inkMuted block">expires in {daysLeft(a.expiresAt)}d</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-pill ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                {a.status === "active" && (
                  <button onClick={() => onCancel(a.id)} className="text-xs text-inkMuted hover:text-down">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

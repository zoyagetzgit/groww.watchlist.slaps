"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Toggle = { disconnectA: boolean; garbageB: boolean; latency: boolean };


export default function BreakItBar() {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<Toggle>({ disconnectA: false, garbageB: false, latency: false });
  const [busy, setBusy] = useState(false);
  const [shockUntil, setShockUntil] = useState<number | null>(null);


  useEffect(() => {
    apiFetch("/chaos")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.chaos) return;
        setState({
          disconnectA: Boolean(data.chaos.disconnectA),
          garbageB: Boolean(data.chaos.garbageB),
          latency: Number(data.chaos.latencyMs) > 0,
        });
        setShockUntil(data.chaos.forcedSectorShock?.expiresAt ?? null);
      })
      .catch(() => {
      
      });
  }, []);

  // Send ONLY the field being changed, so one control can't reset another.
  async function patch(body: Record<string, unknown>, next?: Toggle) {
    setBusy(true);
    if (next) setState(next);
    try {
      await apiFetch("/chaos", { method: "POST", body: JSON.stringify(body) });
    } catch {
   
    } finally {
      setBusy(false);
    }
  }

  const shockActive = shockUntil !== null && shockUntil > Date.now();

  return (
    <div className="border border-border rounded-card overflow-hidden mb-6">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-surfaceMuted text-left"
      >
        <span className="text-xs font-medium text-inkMuted">
          <span className="bg-ink text-white text-[10px] px-1.5 py-0.5 rounded-pill mr-2">DEV</span>
          Demo controls
        </span>
        <span className="text-inkMuted text-xs">{expanded ? "Hide" : "Show"}</span>
      </button>
      {expanded && (
        <div className="px-4 py-3">
          
         
          <div className="flex flex-wrap gap-2 text-xs">
            <Pill
              active={state.disconnectA}
              busy={busy}
              onClick={() => patch({ disconnectA: !state.disconnectA }, { ...state, disconnectA: !state.disconnectA })}
            >
              Disconnect Feed A
            </Pill>
            <Pill
              active={state.garbageB}
              busy={busy}
              onClick={() => patch({ garbageB: !state.garbageB }, { ...state, garbageB: !state.garbageB })}
            >
              Inject garbage into Feed B
            </Pill>
            <Pill
              active={state.latency}
              busy={busy}
              onClick={() => patch({ latencyMs: state.latency ? 0 : 2000 }, { ...state, latency: !state.latency })}
            >
              Add 2000ms latency
            </Pill>
            <Pill
              active={shockActive}
              busy={busy}
              onClick={() => {
                patch({ triggerSectorShock: { sector: "IT", direction: -1 } });
                setShockUntil(Date.now() + 25_000);
              }}
            >
              {shockActive ? "IT selloff running..." : "Trigger IT sector selloff"}
            </Pill>
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({ active, busy, onClick, children }: { active: boolean; busy: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`px-2.5 py-1 rounded-pill border transition-colors ${
        active ? "bg-down text-white border-down" : "border-border text-inkMuted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}


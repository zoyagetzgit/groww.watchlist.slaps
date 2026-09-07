"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Toggle = { disconnectA: boolean; garbageB: boolean; latency: boolean };


export default function BreakItBar() {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<Toggle>({ disconnectA: false, garbageB: false, latency: false });
  const [busy, setBusy] = useState(false);

  async function push(next: Toggle) {
    setBusy(true);
    setState(next);
    try {
      await apiFetch("/chaos", {
        method: "POST",
        body: JSON.stringify({
          disconnectA: next.disconnectA,
          garbageB: next.garbageB,
          latencyMs: next.latency ? 2000 : 0,
        }),
      });
    } catch {

    } finally {
      setBusy(false);
    }
  }

  async function triggerSectorShock() {
    setBusy(true);
    try {
      await apiFetch("/chaos", { method: "POST", body: JSON.stringify({ triggerSectorShock: { sector: "IT", direction: -1 } }) });
    } finally {
      setBusy(false);
    }
  }

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
          <p className="text-[11px] text-inkMuted mb-2">Flipping these live to show the system handling failure.</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Pill active={state.disconnectA} busy={busy} onClick={() => push({ ...state, disconnectA: !state.disconnectA })}>
              Disconnect Feed A
            </Pill>
            <Pill active={state.garbageB} busy={busy} onClick={() => push({ ...state, garbageB: !state.garbageB })}>
              Inject garbage into Feed B
            </Pill>
            <Pill active={state.latency} busy={busy} onClick={() => push({ ...state, latency: !state.latency })}>
              Add 2000ms latency
            </Pill>
            <Pill active={false} busy={busy} onClick={triggerSectorShock}>
              Trigger IT sector selloff
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

import type { ContagionEvent } from "@/lib/types";


export default function ContagionCard({ event }: { event: ContagionEvent }) {
  const up = event.direction === "up";
  return (
    <div className={`border-l-2 ${up ? "border-up" : "border-down"} bg-surfaceMuted rounded-r-card px-4 py-3`}>
      <div className="flex items-center justify-between">
        <span className="font-medium text-ink text-sm">
          {event.affectedSymbols.length}/{event.totalInSector} {event.sector} stocks moved {up ? "up" : "down"}
        </span>
        <span className="text-[10px] font-medium text-inkMuted uppercase tracking-wide">Sector</span>
      </div>
      <p className="text-xs text-inkMuted mt-1">
        {event.affectedSymbols.join(", ")} · avg {Math.abs(event.avgChangePct).toFixed(1)}% · likely {event.cause}, not stock-specific
      </p>
    </div>
  );
}

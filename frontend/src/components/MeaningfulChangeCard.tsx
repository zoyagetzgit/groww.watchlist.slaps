import type { MCSResult } from "@/lib/types";
import ConfidenceBadge from "./ConfidenceBadge";


export default function MeaningfulChangeCard({
  item,
  onRemove,
  onDismissCatalyst,
}: {
  item: MCSResult;
  onRemove?: () => void;
  onDismissCatalyst?: (catalystId: string) => void;
}) {
  const up = item.changePct >= 0;
  const notable = item.score >= 55;

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-3.5 row-divider group">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">{item.symbol}</span>
          {notable && (
            <span className="text-[11px] font-medium text-insight bg-insightSoft px-1.5 py-0.5 rounded-pill" title="Meaningful Change Score">
              {item.score}
            </span>
          )}
        </div>
        <p className="text-xs text-inkMuted truncate max-w-[30ch]">{item.name}</p>

        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <ConfidenceBadge confidence={item.confidence} staleSeconds={item.staleSeconds} />
          {item.catalyst && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] pl-2 pr-1 py-0.5 rounded-pill ${
                item.catalyst.severity === "high" ? "bg-insightSoft text-insight" : "bg-staleSoft text-stale"
              }`}
            >
              {item.catalyst.message}
              {onDismissCatalyst && (
                <button
                  onClick={() => onDismissCatalyst(item.catalyst!.id)}
                  className="opacity-60 hover:opacity-100 leading-none"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="tnum font-semibold text-ink">₹{item.price.toFixed(2)}</div>
          <div
            className={`tnum inline-flex items-center gap-0.5 text-xs font-medium mt-0.5 px-1.5 py-0.5 rounded-pill ${
              up ? "bg-upSoft text-up" : "bg-downSoft text-down"
            }`}
          >
            <span aria-hidden>{up ? "▲" : "▼"}</span>
            {Math.abs(item.changePct).toFixed(2)}%
          </div>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 text-inkMuted hover:text-down text-xs transition-opacity"
            aria-label={`Remove ${item.symbol}`}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

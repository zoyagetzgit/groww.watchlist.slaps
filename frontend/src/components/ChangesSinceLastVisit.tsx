import type { ChangeCard, ContagionEvent, PriceAlert } from "@/lib/types";
import ContagionCard from "./ContagionCard";

const REASON_LABEL: Record<ChangeCard["reason"], string> = {
  new: "Added",
  newly_meaningful: "Now worth watching",
  reversed: "Changed direction",
  moved: "Moved since last visit",
};

export default function ChangesSinceLastVisit({
  changes,
  contagionEvents,
  newlyTriggeredAlerts,
  lastVisitedAt,
  hadPriorSnapshot,
}: {
  changes: ChangeCard[];
  contagionEvents: ContagionEvent[];
  newlyTriggeredAlerts: PriceAlert[];
  lastVisitedAt: string | null;
  hadPriorSnapshot: boolean;
}) {
  if (!hadPriorSnapshot) {
    return (
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-ink mb-1">Since you last checked</h2>
        <p className="text-inkMuted text-xs">First visit - nothing to compare against yet.</p>
      </section>
    );
  }

  const nothingToShow = changes.length === 0 && contagionEvents.length === 0 && newlyTriggeredAlerts.length === 0;

  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold text-ink">Since you last checked</h2>
        {lastVisitedAt && (
          <span className="text-[11px] text-inkMuted">{new Date(lastVisitedAt).toLocaleTimeString()}</span>
        )}
      </div>

      {nothingToShow ? (
        <p className="text-inkMuted text-xs">Nothing crossed the bar - everything's within its normal range.</p>
      ) : (
        <div className="space-y-2">
          {newlyTriggeredAlerts.map((a) => (
            <div key={a.id} className="border-l-2 border-brand bg-brandSoft/40 rounded-r-card px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink text-sm">🔔 {a.symbol} alert triggered</span>
                <span className="text-[10px] font-medium text-brand uppercase tracking-wide">Alert</span>
              </div>
              <p className="text-xs text-inkMuted mt-1">
                Hit ₹{a.triggeredPrice?.toFixed(2)} - you asked to know when it {a.direction === "above" ? "crossed above" : "fell below"} ₹{a.targetPrice.toFixed(2)}.
              </p>
            </div>
          ))}
          {contagionEvents.map((event) => (
            <ContagionCard key={event.sector} event={event} />
          ))}
          {changes.slice(0, 6).map((c) => {
            const up = c.changePct >= 0;
            return (
              <div key={c.symbol} className={`border-l-2 ${up ? "border-up" : "border-down"} bg-surfaceMuted rounded-r-card px-4 py-3`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink text-sm">{c.symbol}</span>
                  <span className="text-[10px] font-medium text-inkMuted uppercase tracking-wide">{REASON_LABEL[c.reason]}</span>
                </div>
                <p className="text-xs text-inkMuted mt-1">{c.explanation}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

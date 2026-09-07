import type { Confidence } from "@/lib/types";


const STYLE: Record<Confidence, string> = {
  LIVE: "bg-insightSoft text-insight",
  STALE: "bg-staleSoft text-stale",
  CONFLICT: "bg-[#FDF3E3] text-[#B7791F]",
};

const DOT: Record<Confidence, string> = {
  LIVE: "bg-insight",
  STALE: "bg-stale",
  CONFLICT: "bg-[#B7791F]",
};

export default function ConfidenceBadge({ confidence, staleSeconds }: { confidence: Confidence; staleSeconds: number }) {
  const label = confidence === "STALE" && staleSeconds < 9999 ? `Stale · ${staleSeconds}s` : capitalize(confidence);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-pill ${STYLE[confidence]}`}
      title="How much to trust this price right now"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[confidence]}`} aria-hidden />
      {label}
    </span>
  );
}

function capitalize(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

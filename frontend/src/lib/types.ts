export type Confidence = "LIVE" | "STALE" | "CONFLICT";

export type Catalyst = { id: string; message: string; severity: "info" | "high" };

export type MCSResult = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  confidence: Confidence;
  staleSeconds: number;
  score: number;
  changePct: number;
  catalyst: Catalyst | null;
  explanation: string;
};

export type ChangeCard = MCSResult & {
  reason: "new" | "newly_meaningful" | "reversed" | "moved";
  priorPrice?: number;
  priorScore?: number;
};

export type ContagionEvent = {
  sector: string;
  direction: "up" | "down";
  affectedSymbols: string[];
  totalInSector: number;
  avgChangePct: number;
  cause: string;
};

export type AlertStatus = "active" | "triggered" | "expired" | "cancelled";

export type PriceAlert = {
  id: string;
  symbol: string;
  direction: "above" | "below";
  targetPrice: number;
  status: AlertStatus;
  createdAt: string;
  expiresAt: string;
  triggeredAt: string | null;
  triggeredPrice: number | null;
};

export type MarketStateResponse = {
  all: MCSResult[];
  changes: ChangeCard[];
  contagionEvents: ContagionEvent[];
  newlyTriggeredAlerts: PriceAlert[];
  lastVisitedAt: string | null;
  hadPriorSnapshot: boolean;
  servedAt: number;
};

export type Watchlist = { id: string; name: string; items: { symbol: string }[] };

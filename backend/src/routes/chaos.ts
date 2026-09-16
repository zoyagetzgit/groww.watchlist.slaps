import type { FastifyInstance } from "fastify";
import { setChaos, getChaos } from "../lib/market/engine.js";

// No auth check here on purpose - this is a demo control, not a real
// feature, and gating it behind login would just mean an extra header to
// remember to send while you're mid-presentation. Would absolutely need
// auth (or removing entirely) before this went anywhere near production.

const SECTOR_SHOCK_DURATION_MS = 25_000;

export default async function chaosRoutes(app: FastifyInstance) {
  app.get("/chaos", async () => ({ chaos: getChaos() }));

  app.post("/chaos", async (req) => {
    const body = (req.body ?? {}) as {
      disconnectA?: boolean;
      garbageB?: boolean;
      latencyMs?: number;
      triggerSectorShock?: { sector: "IT" | "Banking" | "Auto" | "Energy" | "Consumer" | "Conglomerate"; direction: 1 | -1 } | null;
    };

    // Only touch what the caller actually sent. Previously every field was
    // passed through unconditionally, so a request that set one control
    // silently reset the others - which made the panel's buttons appear to
    // cancel each other out.
    const patch: Parameters<typeof setChaos>[0] = {};
    if (body.disconnectA !== undefined) patch.disconnectA = body.disconnectA;
    if (body.garbageB !== undefined) patch.garbageB = body.garbageB;
    if (body.latencyMs !== undefined) patch.latencyMs = body.latencyMs;

    if (body.triggerSectorShock !== undefined) {
      patch.forcedSectorShock = body.triggerSectorShock
        ? { ...body.triggerSectorShock, expiresAt: Date.now() + SECTOR_SHOCK_DURATION_MS }
        : null;
    }

    setChaos(patch);
    return { chaos: getChaos() };
  });
}


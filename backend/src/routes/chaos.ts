import type { FastifyInstance } from "fastify";
import { setChaos, getChaos } from "../lib/market/engine.js";


export default async function chaosRoutes(app: FastifyInstance) {
  app.get("/chaos", async () => ({ chaos: getChaos() }));

  app.post("/chaos", async (req) => {
    const body = req.body as {
      disconnectA?: boolean;
      garbageB?: boolean;
      latencyMs?: number;
      triggerSectorShock?: { sector: "IT" | "Banking" | "Auto" | "Energy" | "Consumer" | "Conglomerate"; direction: 1 | -1 } | null;
    };

    setChaos({
      disconnectA: body.disconnectA,
      garbageB: body.garbageB,
      latencyMs: body.latencyMs,
      forcedSectorShock: body.triggerSectorShock ?? null,
    });

    return { chaos: getChaos() };
  });
}

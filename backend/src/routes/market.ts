import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../lib/session.js";
import { diffAgainstSnapshot, type Snapshot } from "../lib/diff.js";
import { getChaos, sleep } from "../lib/market/engine.js";

export default async function marketRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { watchlistId?: string; commit?: string } }>("/market/state", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Not signed in" });

    const { watchlistId, commit } = req.query;
    if (!watchlistId) return reply.code(400).send({ error: "watchlistId is required" });

    
    const { latencyMs } = getChaos();
    if (latencyMs > 0) await sleep(latencyMs);

    const watchlist = await prisma.watchlist.findUnique({ where: { id: watchlistId } });
    if (!watchlist || watchlist.userId !== user.id) return reply.code(404).send({ error: "Not found" });

    const items = await prisma.watchlistItem.findMany({ where: { watchlistId } });
    const symbols = items.map((i) => i.symbol);
    const dismissed: string[] = watchlist.dismissedCatalystIds ? JSON.parse(watchlist.dismissedCatalystIds) : [];

    const priorSnapshot: Snapshot | null = watchlist.lastSnapshot ? JSON.parse(watchlist.lastSnapshot) : null;
    const { all, changes, contagionEvents, newSnapshot } = diffAgainstSnapshot(symbols, priorSnapshot, dismissed);

    if (commit === "true") {
      await prisma.watchlist.update({
        where: { id: watchlistId },
        data: { lastSnapshot: JSON.stringify(newSnapshot), lastVisitedAt: new Date() },
      });
    }

    // An alert triggering is just another kind of "thing that changed since
    // you last looked" - so it uses the exact same comparison point as the
    // price diffing above (watchlist.lastVisitedAt) instead of inventing a
    // separate "have you seen this alert" flag to track.
    const newlyTriggeredAlerts = watchlist.lastVisitedAt
      ? await prisma.priceAlert.findMany({
          where: { userId: user.id, status: "triggered", triggeredAt: { gt: watchlist.lastVisitedAt } },
        })
      : [];

    return {
      all,
      changes,
      contagionEvents,
      newlyTriggeredAlerts,
      lastVisitedAt: watchlist.lastVisitedAt,
      hadPriorSnapshot: priorSnapshot !== null,
      servedAt: Date.now(),
    };
  });
}

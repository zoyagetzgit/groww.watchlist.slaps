import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../lib/session.js";
import { findSymbol } from "../lib/market/universe.js";

async function ownedWatchlist(id: string, userId: string) {
  const w = await prisma.watchlist.findUnique({ where: { id } });
  if (!w || w.userId !== userId) return null;
  return w;
}

export default async function itemRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>("/watchlists/:id/items", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Not signed in" });

    const watchlist = await ownedWatchlist(req.params.id, user.id);
    if (!watchlist) return reply.code(404).send({ error: "Not found" });

    const body = req.body as { symbol?: string };
    const symbol = (body?.symbol ?? "").toUpperCase();
    if (!findSymbol(symbol)) return reply.code(400).send({ error: "Unknown symbol" });

    try {
      await prisma.watchlistItem.create({ data: { watchlistId: watchlist.id, symbol } });
    } catch {
      // already on the list - fine, treat as a no-op
    }

    const updated = await prisma.watchlist.findUnique({ where: { id: watchlist.id }, include: { items: true } });
    return { watchlist: updated };
  });

  app.delete<{ Params: { id: string } }>("/watchlists/:id/items", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Not signed in" });

    const watchlist = await ownedWatchlist(req.params.id, user.id);
    if (!watchlist) return reply.code(404).send({ error: "Not found" });

    const body = req.body as { symbol?: string };
    const symbol = (body?.symbol ?? "").toUpperCase();
    await prisma.watchlistItem.deleteMany({ where: { watchlistId: watchlist.id, symbol } });

    const updated = await prisma.watchlist.findUnique({ where: { id: watchlist.id }, include: { items: true } });
    return { watchlist: updated };
  });

  // dismiss a catalyst so it stops contributing to MCS / stops showing as unread
  app.post<{ Params: { id: string } }>("/watchlists/:id/catalysts/dismiss", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Not signed in" });

    const watchlist = await ownedWatchlist(req.params.id, user.id);
    if (!watchlist) return reply.code(404).send({ error: "Not found" });

    const body = req.body as { catalystId?: string };
    if (!body?.catalystId) return reply.code(400).send({ error: "catalystId is required" });

    const existing: string[] = watchlist.dismissedCatalystIds ? JSON.parse(watchlist.dismissedCatalystIds) : [];
    const next = Array.from(new Set([...existing, body.catalystId]));

    await prisma.watchlist.update({ where: { id: watchlist.id }, data: { dismissedCatalystIds: JSON.stringify(next) } });
    return { ok: true };
  });
}

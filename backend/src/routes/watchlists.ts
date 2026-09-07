import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../lib/session.js";

const STARTER_SYMBOLS = ["RELIANCE", "TCS", "INFY", "WIPRO", "TATAMOTORS"];


export default async function watchlistRoutes(app: FastifyInstance) {
  app.get("/watchlists", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Not signed in" });

    let lists = await prisma.watchlist.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });

    if (lists.length === 0) {
      const created = await prisma.watchlist.create({
        data: {
          name: "My Watchlist",
          userId: user.id,
          items: { create: STARTER_SYMBOLS.map((symbol) => ({ symbol })) },
        },
        include: { items: true },
      });
      lists = [created];
    }

    return { watchlists: lists };
  });

  app.post("/watchlists", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Not signed in" });

    const body = req.body as { name?: string };
    const watchlist = await prisma.watchlist.create({
      data: { name: (body?.name ?? "").trim() || "New Watchlist", userId: user.id },
      include: { items: true },
    });
    return { watchlist };
  });

  app.delete<{ Params: { id: string } }>("/watchlists/:id", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Not signed in" });

    const watchlist = await prisma.watchlist.findUnique({ where: { id: req.params.id } });
    if (!watchlist || watchlist.userId !== user.id) return reply.code(404).send({ error: "Not found" });

    await prisma.watchlist.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}

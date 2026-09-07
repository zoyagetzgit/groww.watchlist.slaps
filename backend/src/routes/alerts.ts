import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../lib/session.js";
import { findSymbol } from "../lib/market/universe.js";

const ALLOWED_TTL_DAYS = [1, 3, 7, 30];

export default async function alertRoutes(app: FastifyInstance) {
  
  app.get("/alerts", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Not signed in" });

    const alerts = await prisma.priceAlert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return { alerts };
  });

  app.post("/alerts", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Not signed in" });

    const body = req.body as { symbol?: string; direction?: string; targetPrice?: number; ttlDays?: number };
    const symbol = (body.symbol ?? "").toUpperCase();
    const direction = body.direction;
    const targetPrice = Number(body.targetPrice);
    const ttlDays = Number(body.ttlDays);

    if (!findSymbol(symbol)) return reply.code(400).send({ error: "Unknown symbol" });
    if (direction !== "above" && direction !== "below") return reply.code(400).send({ error: "direction must be 'above' or 'below'" });
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) return reply.code(400).send({ error: "targetPrice must be a positive number" });
    if (!ALLOWED_TTL_DAYS.includes(ttlDays)) return reply.code(400).send({ error: `ttlDays must be one of ${ALLOWED_TTL_DAYS.join(", ")}` });

    const alert = await prisma.priceAlert.create({
      data: {
        userId: user.id,
        symbol,
        direction,
        targetPrice,
        expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      },
    });
    return { alert };
  });

  app.delete<{ Params: { id: string } }>("/alerts/:id", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Not signed in" });

    const alert = await prisma.priceAlert.findUnique({ where: { id: req.params.id } });
    if (!alert || alert.userId !== user.id) return reply.code(404).send({ error: "Not found" });

    // cancelling ≠ deleting. Keeping the row means the frontend can still
    // show "you cancelled this one" instead of it just vanishing, which
    // matters if the write-ahead log replays this action after a delay.
    const updated = await prisma.priceAlert.update({ where: { id: alert.id }, data: { status: "cancelled" } });
    return { alert: updated };
  });
}

import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../lib/session.js";

export default async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (req, reply) => {
    const body = req.body as { name?: string };
    const name = (body?.name ?? "").trim();

    if (name.length < 2) {
      return reply.code(400).send({ error: "Name needs to be at least 2 characters." });
    }

    let user = await prisma.user.findUnique({ where: { name } });
    if (!user) user = await prisma.user.create({ data: { name } });

    
    return { token: user.id, name: user.name };
  });

  app.get("/auth/me", async (req, reply) => {
    const user = await requireUser(req);
    if (!user) return reply.code(401).send({ error: "Not signed in" });
    return { id: user.id, name: user.name };
  });
}

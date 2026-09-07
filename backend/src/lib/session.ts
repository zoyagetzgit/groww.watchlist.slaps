import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";


export async function requireUser(req: FastifyRequest) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  const user = await prisma.user.findUnique({ where: { id: token } });
  return user;
}

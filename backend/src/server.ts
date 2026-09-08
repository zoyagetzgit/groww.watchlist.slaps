import Fastify from "fastify";
import cors from "@fastify/cors";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import watchlistRoutes from "./routes/watchlists.js";
import itemRoutes from "./routes/items.js";
import marketRoutes from "./routes/market.js";
import chaosRoutes from "./routes/chaos.js";
import alertRoutes from "./routes/alerts.js";
import { startAlertSweep } from "./lib/alertSweep.js";

const app = Fastify({ logger: { level: "info" } });


const rawOrigins = process.env.CORS_ORIGIN ?? "http://localhost:3000,https://groww-watchlist-sage.vercel.app";
const allowedOrigins = rawOrigins.split(",").map((url) => url.trim().replace(/\/$/, ""));

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const cleanOrigin = origin.trim().replace(/\/$/, "");
    if (allowedOrigins.includes(cleanOrigin)) {
      return cb(null, true);
    }
    return cb(new Error("Not allowed by CORS"), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: false
});

await app.register(authRoutes);
await app.register(watchlistRoutes);
await app.register(itemRoutes);
await app.register(marketRoutes);
await app.register(chaosRoutes);
await app.register(alertRoutes);

app.get("/health", async () => ({ ok: true }));

startAlertSweep();

const port = Number(process.env.PORT ?? 4000);


await app.ready();

app.listen({ port, host: "0.0.0.0" }).then(() => {
  console.log(`watchlist backend up on port ${port}`);
});

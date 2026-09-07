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

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",");
await app.register(cors, { origin: allowedOrigins, credentials: false });

await app.register(authRoutes);
await app.register(watchlistRoutes);
await app.register(itemRoutes);
await app.register(marketRoutes);
await app.register(chaosRoutes);
await app.register(alertRoutes);

app.get("/health", async () => ({ ok: true }));

startAlertSweep();

const port = Number(process.env.PORT ?? 4000);
app.listen({ port, host: "0.0.0.0" }).then(() => {
  console.log(`watchlist backend up on http://localhost:${port}`);
});

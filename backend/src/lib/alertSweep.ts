import { prisma } from "./prisma.js";
import { evaluateAlert } from "./market/alerts.js";


export async function sweepAlerts() {
  const now = Date.now();
  const active = await prisma.priceAlert.findMany({ where: { status: "active" } });

  for (const alert of active) {
    const result = evaluateAlert(alert, now);
    if (result.outcome === "unchanged") continue;

    if (result.outcome === "expired") {
      await prisma.priceAlert.update({ where: { id: alert.id }, data: { status: "expired" } });
    } else {
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: { status: "triggered", triggeredAt: new Date(now), triggeredPrice: result.price },
      });
    }
  }
}

export function startAlertSweep(intervalMs = 4000) {
  const timer = setInterval(() => {
    sweepAlerts().catch((err) => console.error("alert sweep failed", err));
  }, intervalMs);
  return () => clearInterval(timer);
}

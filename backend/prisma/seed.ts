
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { name: "demo" },
    update: {},
    create: { name: "demo" },
  });

  const existing = await prisma.watchlist.findFirst({ where: { userId: user.id } });
  if (!existing) {
    await prisma.watchlist.create({
      data: {
        name: "My Watchlist",
        userId: user.id,
        items: {
          create: ["RELIANCE", "TCS", "INFY", "WIPRO", "TATAMOTORS", "SBIN"].map((symbol) => ({ symbol })),
        },
      },
    });
  }

  console.log('Seeded. Sign in with the name "demo" in the frontend to use this account.');
}

main().finally(() => prisma.$disconnect());

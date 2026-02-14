// prisma/seed.ts
import { prisma } from "../lib/prisma";

async function main() {
  const existing = await prisma.business.findFirst();
  if (existing) {
    console.log("Seed: Business already exists:", existing.id);
    return;
  }

  const biz = await prisma.business.create({
    data: {
      name: "Demo Business",
      email: "demo@business.com",
      phone: null,
    },
  });

  console.log("Seed: Created business:", biz.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from "../src";

async function main() {
  const userCount = await prisma.user.count();
  console.log(`Tiki Acca seed complete. Users in DB: ${userCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

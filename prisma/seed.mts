import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const employees = [
  { name: "ปิยะพงษ์ คงสิบ", groupType: "A" as const, wfhQuota: 2, preferredOffDay: null },
  { name: "กฤษกร วุฒิ", groupType: "B" as const, wfhQuota: 1, preferredOffDay: "Saturday" },
  { name: "จิรายุ เริงหาญ", groupType: "A" as const, wfhQuota: 0, preferredOffDay: null },
  { name: "พีรภาส ไพรบึง", groupType: "B" as const, wfhQuota: 3, preferredOffDay: "Sunday" },
  { name: "อัญชลี ทะพงษ์", groupType: "A" as const, wfhQuota: 1, preferredOffDay: null },
];

async function main() {
  console.log("Seeding database...");

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    await prisma.employee.upsert({
      where: { id: i + 1 },
      update: {},
      create: emp,
    });
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

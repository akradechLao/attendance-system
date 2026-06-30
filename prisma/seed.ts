import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const employees = [
  { name: "ปิยะพงษ์ คงสิบ", groupType: "A" as const, wfhQuota: 1, preferredOffDay: null },
  { name: "กฤษกร วุฒิ", groupType: "A" as const, wfhQuota: 1, preferredOffDay: "Saturday" },
  { name: "จิรายุ เริงหาญ", groupType: "B" as const, wfhQuota: 1, preferredOffDay: null },
  { name: "พีรภาส ไพรบึง", groupType: "B" as const, wfhQuota: 1, preferredOffDay: "Sunday" },
  { name: "อัญชลี ทะพงษ์", groupType: "A" as const, wfhQuota: 1, preferredOffDay: null },
];

async function main() {
  console.log("Seeding database...");

  const adminUser = await prisma.adminUser.findFirst();
  if (!adminUser) {
    await prisma.adminUser.create({
      data: { username: "admin", password: "1234" },
    });
    console.log("Default admin user created (username: admin, password: 1234)");
  }

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
      await prisma.employee.upsert({
      where: { id: i + 1 },
      update: { groupType: emp.groupType, wfhQuota: emp.wfhQuota, preferredOffDay: emp.preferredOffDay },
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

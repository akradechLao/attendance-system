import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

const employees = [
  { name: "สมชาย ใจดี", groupType: "A", wfhQuota: 1, preferredOffDay: null },
  { name: "สมหญิง รักงาน", groupType: "B", wfhQuota: 1, preferredOffDay: "Saturday" },
  { name: "วิชัย เก่งมาก", groupType: "A", wfhQuota: 1, preferredOffDay: null },
  { name: "สุภาพร สดใส", groupType: "B", wfhQuota: 1, preferredOffDay: "Sunday" },
  { name: "นิพนธ์ มั่นคง", groupType: "A", wfhQuota: 1, preferredOffDay: null },
  { name: "กานดา สวยงาม", groupType: "B", wfhQuota: 1, preferredOffDay: "Saturday" },
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

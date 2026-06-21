import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/app/api/auth";

export async function GET(request: NextRequest) {
  const authError = verifyApiKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  try {
    let records;

    if (date) {
      records = await prisma.attendanceLog.findMany({
        where: { date },
        include: { employee: true },
        orderBy: { checkIn: "asc" },
      });
    } else if (startDate && endDate) {
      records = await prisma.attendanceLog.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
        },
        include: { employee: true },
        orderBy: [{ date: "asc" }, { checkIn: "asc" }],
      });
    } else {
      const today = new Date().toISOString().split("T")[0];
      records = await prisma.attendanceLog.findMany({
        where: { date: today },
        include: { employee: true },
        orderBy: { checkIn: "asc" },
      });
    }

    const data = records.map((r) => ({
      id: r.id,
      employeeName: r.employee.name,
      groupType: r.employee.groupType,
      date: r.date,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      status: r.status,
      latLong: r.latLong,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

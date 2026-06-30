import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/app/api/auth";

export async function GET(request: NextRequest) {
  const authError = verifyApiKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  try {
    let where = {};

    if (startDate && endDate) {
      where = { workDate: { gte: startDate, lte: endDate } };
    } else {
      const today = new Date().toISOString().split("T")[0];
      const startOfWeek = new Date(today);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      where = {
        workDate: {
          gte: startOfWeek.toISOString().split("T")[0],
          lte: endOfWeek.toISOString().split("T")[0],
        },
      };
    }

    const shifts = await prisma.shiftSchedule.findMany({
      where,
      include: { employee: true },
      orderBy: [{ workDate: "asc" }, { employee: { name: "asc" } }],
    });

    const data = shifts.map((s) => ({
      id: s.id,
      employeeName: s.employee.name,
      groupType: s.employee.groupType,
      workDate: s.workDate,
      shiftType: s.shiftType,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

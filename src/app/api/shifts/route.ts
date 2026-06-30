import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function checkAuth(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey === process.env.API_KEY) return true;
  const session = request.cookies.get("admin_session");
  if (session && session.value === "hr-attendance-admin-2024") return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

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
      empId: s.empId,
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

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, weekStart } = body;

    if (action === "auto-book-weekdays" && weekStart) {
      const employees = await prisma.employee.findMany({
        select: { id: true, groupType: true },
      });

      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const dayOfWeek = d.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          dates.push(d.toISOString().split("T")[0]);
        }
      }

      let count = 0;
      for (const emp of employees) {
        for (const date of dates) {
          const shiftType = emp.groupType === "B" ? "ot" : "normal";
          const existing = await prisma.shiftSchedule.findUnique({
            where: { empId_workDate: { empId: emp.id, workDate: date } },
          });
          if (!existing) {
            await prisma.shiftSchedule.create({
              data: { empId: emp.id, workDate: date, shiftType },
            });
            count++;
          }
        }
      }

      return NextResponse.json({ success: true, message: `บุ๊ควันทำงาน ${count} รายการสำเร็จ` });
    }

    if (action === "toggle-weekend" && body.empId && body.workDate) {
      const { empId, workDate, shiftType } = body;
      const existing = await prisma.shiftSchedule.findUnique({
        where: { empId_workDate: { empId, workDate } },
      });

      if (shiftType === "off") {
        if (existing) {
          await prisma.shiftSchedule.delete({
            where: { empId_workDate: { empId, workDate } },
          });
        }
        return NextResponse.json({ success: true, message: "ลบเวรวันหยุดสำเร็จ" });
      }

      if (existing) {
        await prisma.shiftSchedule.update({
          where: { empId_workDate: { empId, workDate } },
          data: { shiftType },
        });
      } else {
        await prisma.shiftSchedule.create({
          data: { empId, workDate, shiftType },
        });
      }

      return NextResponse.json({ success: true, message: "อัพเดทเวรสำเร็จ" });
    }

    return NextResponse.json({ success: false, message: "คำขอไม่ถูกต้อง" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

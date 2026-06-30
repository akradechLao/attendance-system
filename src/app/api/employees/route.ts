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

  try {
    const employees = await prisma.employee.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        groupType: true,
        wfhQuota: true,
        preferredOffDay: true,
      },
    });

    return NextResponse.json({ success: true, data: employees });
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
    const { name, groupType, preferredOffDay } = body;

    if (!name || !groupType) {
      return NextResponse.json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }

    const employee = await prisma.employee.create({
      data: { name, groupType, wfhQuota: 1, preferredOffDay: preferredOffDay || null },
    });

    return NextResponse.json({ success: true, message: "เพิ่มพนักงานสำเร็จ", data: employee });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, groupType, preferredOffDay } = body;

    if (!id || !name || !groupType) {
      return NextResponse.json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: { name, groupType, wfhQuota: 1, preferredOffDay: preferredOffDay || null },
    });

    return NextResponse.json({ success: true, message: "แก้ไขพนักงานสำเร็จ", data: employee });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ success: false, message: "ไม่พบรหัสพนักงาน" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.attendanceLog.deleteMany({ where: { empId: id } }),
      prisma.shiftSchedule.deleteMany({ where: { empId: id } }),
      prisma.leaveRequest.deleteMany({ where: { empId: id } }),
      prisma.wfhRecord.deleteMany({ where: { empId: id } }),
      prisma.onboardingRecord.deleteMany({ where: { empId: id } }),
      prisma.employee.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, message: "ลบพนักงานสำเร็จ" });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

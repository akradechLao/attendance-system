"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface LeaveResult {
  success: boolean;
  message: string;
}

export interface LeaveRecord {
  id: number;
  empId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: Date;
  employee: {
    id: number;
    name: string;
    groupType: string;
  };
}

export async function createLeave(
  empId: number,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason: string
): Promise<LeaveResult> {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: empId } });
    if (!employee) {
      return { success: false, message: "ไม่พบพนักงาน" };
    }

    if (startDate > endDate) {
      return { success: false, message: "วันที่เริ่มต้องมาก่อนวันที่สิ้นสุด" };
    }

    await prisma.leaveRequest.create({
      data: { empId, leaveType, startDate, endDate, reason },
    });

    revalidatePath("/leaves");
    revalidatePath("/");

    return { success: true, message: `บันทึกการลางานสำเร็จ (${employee.name})` };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function getAllLeaves(): Promise<LeaveRecord[]> {
  const records = await prisma.leaveRequest.findMany({
    include: { employee: true },
    orderBy: { createdAt: "desc" },
  });
  return records.map((r) => ({
    ...r,
    employee: { id: r.employee.id, name: r.employee.name, groupType: r.employee.groupType },
  }));
}

export async function getUpcomingLeaves(): Promise<LeaveRecord[]> {
  const today = new Date().toISOString().split("T")[0];
  const weekLater = new Date();
  weekLater.setDate(weekLater.getDate() + 7);
  const weekLaterStr = weekLater.toISOString().split("T")[0];

  const records = await prisma.leaveRequest.findMany({
    where: {
      startDate: { lte: weekLaterStr },
      endDate: { gte: today },
    },
    include: { employee: true },
    orderBy: { startDate: "asc" },
  });

  return records.map((r) => ({
    ...r,
    employee: { id: r.employee.id, name: r.employee.name, groupType: r.employee.groupType },
  }));
}

export async function deleteLeave(id: number): Promise<LeaveResult> {
  try {
    await prisma.leaveRequest.delete({ where: { id } });
    revalidatePath("/leaves");
    revalidatePath("/");
    return { success: true, message: "ลบรายการลางานสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

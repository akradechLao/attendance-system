"use server";

import { prisma } from "@/lib/prisma";
import { getStatus, isTodaySunday } from "@/lib/business-rules";
import { revalidatePath } from "next/cache";

function getThaiTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}

export interface CheckInResult {
  success: boolean;
  message: string;
  data?: {
    id: number;
    checkIn: string;
    status: string;
    latLong: string;
    checkInPhoto: string | null;
  };
}

export interface CheckOutResult {
  success: boolean;
  message: string;
  data?: {
    id: number;
    checkOut: string;
    latLong: string;
    checkOutPhoto: string | null;
  };
}

export async function checkIn(
  empId: number,
  latLong: string,
  photoUrl?: string
): Promise<CheckInResult> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: empId },
    });

    if (!employee) {
      return { success: false, message: "ไม่พบพนักงาน" };
    }

    const now = getThaiTime();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const checkInTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const status = getStatus(checkInTime, employee.groupType);

    const existing = await prisma.attendanceLog.findUnique({
      where: { empId_date: { empId, date: today } },
    });

    let record;
    if (existing) {
      record = await prisma.attendanceLog.update({
        where: { id: existing.id },
        data: { checkIn: checkInTime, status, latLong, checkInPhoto: photoUrl || null },
      });
    } else {
      record = await prisma.attendanceLog.create({
        data: { empId, checkIn: checkInTime, status, latLong, date: today, checkInPhoto: photoUrl || null },
      });
    }

    revalidatePath("/");
    revalidatePath("/employee");

    return {
      success: true,
      message: `เช็คอินสำเร็จ เวลา ${checkInTime} (${status === "late" ? "สาย" : "ตรงเวลา"})`,
      data: {
        id: record.id,
        checkIn: checkInTime,
        status,
        latLong,
        checkInPhoto: record.checkInPhoto,
      },
    };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function checkOut(
  empId: number,
  latLong: string,
  photoUrl?: string
): Promise<CheckOutResult> {
  try {
    const now = getThaiTime();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const checkOutTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const existing = await prisma.attendanceLog.findUnique({
      where: { empId_date: { empId, date: today } },
    });

    if (!existing) {
      return { success: false, message: "ยังไม่ได้เช็คอินวันนี้" };
    }

    const record = await prisma.attendanceLog.update({
      where: { id: existing.id },
      data: { checkOut: checkOutTime, latLong, checkOutPhoto: photoUrl || null },
    });

    revalidatePath("/");
    revalidatePath("/employee");

    return {
      success: true,
      message: `เช็คเอาท์สำเร็จ เวลา ${checkOutTime}`,
      data: {
        id: record.id,
        checkOut: checkOutTime,
        latLong,
        checkOutPhoto: record.checkOutPhoto,
      },
    };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function getTodayAttendance() {
  const now = getThaiTime();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return prisma.attendanceLog.findMany({
    where: { date: today },
    include: { employee: true },
    orderBy: { checkIn: "asc" },
  });
}

export async function getAttendanceByDate(date: string) {
  return prisma.attendanceLog.findMany({
    where: { date },
    include: { employee: true },
    orderBy: { checkIn: "asc" },
  });
}

export async function getAllEmployees() {
  return prisma.employee.findMany({
    orderBy: { id: "asc" },
  });
}

export async function getSundayMissingAfternoon() {
  if (!isTodaySunday()) return [];

  const now = getThaiTime();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const records = await prisma.attendanceLog.findMany({
    where: {
      date: today,
      checkIn: { not: null },
    },
    include: { employee: true },
  });

  return records.filter((r) => r.checkIn && r.checkIn < "13:00:00");
}

export async function getSaturdayShiftCount(date: string) {
  return prisma.shiftSchedule.count({
    where: { workDate: date },
  });
}

export async function getShiftScheduleForWeek(startDate: string) {
  const end = new Date(startDate);
  end.setDate(end.getDate() + 6);
  const endDate = end.toISOString().split("T")[0];

  return prisma.shiftSchedule.findMany({
    where: {
      workDate: { gte: startDate, lte: endDate },
    },
    include: { employee: true },
    orderBy: [{ workDate: "asc" }, { employee: { name: "asc" } }],
  });
}

export async function addShift(
  empId: number,
  workDate: string,
  shiftType: string
) {
  try {
    const existing = await prisma.shiftSchedule.findUnique({
      where: { empId_workDate: { empId, workDate } },
    });

    if (existing) {
      await prisma.shiftSchedule.update({
        where: { id: existing.id },
        data: { shiftType: shiftType as "normal" | "ot" | "saturday" | "sunday" },
      });
    } else {
      await prisma.shiftSchedule.create({
        data: { empId, workDate, shiftType: shiftType as "normal" | "ot" | "saturday" | "sunday" },
      });
    }

    revalidatePath("/shifts");
    return { success: true, message: "เพิ่มตารางเวรสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

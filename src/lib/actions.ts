"use server";

import { prisma } from "@/lib/prisma";
import { getStatus, isTodaySunday, checkLocation, parseLatLong } from "@/lib/business-rules";
import { revalidatePath } from "next/cache";
import { sendTelegramPhoto, sendTelegramMessage } from "@/lib/telegram";

function getThaiTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}

export interface CheckInResult {
  success: boolean;
  message: string;
  distanceInfo?: string;
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
  distanceInfo?: string;
  data?: {
    id: number;
    checkOut: string;
    latLong: string;
    checkOutPhoto: string | null;
  };
}

async function getActiveOfficeLocation() {
  return prisma.officeLocation.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

function formatDistanceInfo(distanceMeters: number, officeName: string): string {
  return `📍 อยู่ห่างจาก "${officeName}" ${distanceMeters} เมตร`;
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

    const wfhRecord = await prisma.wfhRecord.findUnique({
      where: { empId_date: { empId, date: today } },
    });
    const isWfh = wfhRecord !== null && wfhRecord.status !== "rejected";

    if (!isWfh) {
      const officeLocation = await getActiveOfficeLocation();
      let distanceInfo: string | undefined;

      if (officeLocation && latLong && latLong !== "GPS not available") {
        const userLocation = parseLatLong(latLong);
        if (userLocation) {
          const locationCheck = checkLocation(
            userLocation.lat,
            userLocation.lon,
            officeLocation.latitude,
            officeLocation.longitude,
            officeLocation.radiusMeters
          );
          distanceInfo = formatDistanceInfo(locationCheck.distanceMeters, officeLocation.name);

          if (!locationCheck.withinRadius) {
            return {
              success: false,
              message: `เช็คอินไม่สำเร็จ - ${locationCheck.message}`,
              distanceInfo,
            };
          }
        }
      }
    }

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

    const statusText = status === "late" ? "สาย" : "ตรงเวลา";
    const telegramCaption = [
      `✅ <b>เช็คอินสำเร็จ</b>`,
      `👤 <b>ชื่อ:</b> ${employee.name}`,
      `⏰ <b>เวลา:</b> ${checkInTime}`,
      `📍 <b>GPS:</b> ${latLong}`,
      `📊 <b>สถานะ:</b> ${statusText}`,
      ...(distanceInfo ? [`📏 <b>ระยะทาง:</b> ${distanceInfo}`] : []),
    ].join("\n");

    if (photoUrl && photoUrl.startsWith("data:image")) {
      sendTelegramPhoto(photoUrl, telegramCaption);
    } else {
      sendTelegramMessage(telegramCaption);
    }

    return {
      success: true,
      message: `เช็คอินสำเร็จ เวลา ${checkInTime} (${status === "late" ? "สาย" : "ตรงเวลา"})`,
      distanceInfo,
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
      include: { employee: true },
    });

    if (!existing) {
      return { success: false, message: "ยังไม่ได้เช็คอินวันนี้" };
    }

    const wfhRecord = await prisma.wfhRecord.findUnique({
      where: { empId_date: { empId, date: today } },
    });
    const isWfh = wfhRecord !== null && wfhRecord.status !== "rejected";

    if (!isWfh) {
      const officeLocation = await getActiveOfficeLocation();
      let distanceInfo: string | undefined;

      if (officeLocation && latLong && latLong !== "GPS not available") {
        const userLocation = parseLatLong(latLong);
        if (userLocation) {
          const locationCheck = checkLocation(
            userLocation.lat,
            userLocation.lon,
            officeLocation.latitude,
            officeLocation.longitude,
            officeLocation.radiusMeters
          );
          distanceInfo = formatDistanceInfo(locationCheck.distanceMeters, officeLocation.name);

          if (!locationCheck.withinRadius) {
            return {
              success: false,
              message: `เช็คเอาท์ไม่สำเร็จ - ${locationCheck.message}`,
              distanceInfo,
            };
          }
        }
      }
    }

    const record = await prisma.attendanceLog.update({
      where: { id: existing.id },
      data: { checkOut: checkOutTime, latLong, checkOutPhoto: photoUrl || null },
    });

    revalidatePath("/");
    revalidatePath("/employee");

    const telegramCaption = [
      `🚪 <b>เช็คเอาท์สำเร็จ</b>`,
      `👤 <b>ชื่อ:</b> ${existing.employee.name}`,
      `⏰ <b>เวลา:</b> ${checkOutTime}`,
      `📍 <b>GPS:</b> ${latLong}`,
      ...(distanceInfo ? [`📏 <b>ระยะทาง:</b> ${distanceInfo}`] : []),
    ].join("\n");

    if (photoUrl && photoUrl.startsWith("data:image")) {
      sendTelegramPhoto(photoUrl, telegramCaption);
    } else {
      sendTelegramMessage(telegramCaption);
    }

    return {
      success: true,
      message: `เช็คเอาท์สำเร็จ เวลา ${checkOutTime}`,
      distanceInfo,
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

export async function createEmployee(
  name: string,
  groupType: "A" | "B",
  wfhQuota: number,
  preferredOffDay: string | null
) {
  try {
    await prisma.employee.create({
      data: { name, groupType, wfhQuota, preferredOffDay },
    });
    revalidatePath("/employees");
    revalidatePath("/");
    return { success: true, message: "เพิ่มพนักงานสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function updateEmployee(
  id: number,
  name: string,
  groupType: "A" | "B",
  wfhQuota: number,
  preferredOffDay: string | null
) {
  try {
    await prisma.employee.update({
      where: { id },
      data: { name, groupType, wfhQuota, preferredOffDay },
    });
    revalidatePath("/employees");
    revalidatePath("/");
    return { success: true, message: "แก้ไขพนักงานสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function deleteEmployee(id: number) {
  try {
    await prisma.employee.delete({ where: { id } });
    revalidatePath("/employees");
    revalidatePath("/");
    return { success: true, message: "ลบพนักงานสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function requestWfh(empId: number, date: string, reason: string) {
  try {
    const now = getThaiTime();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthRecords = await prisma.wfhRecord.findMany({
      where: {
        empId,
        date: { startsWith: month },
        status: { not: "rejected" },
      },
    });

    if (monthRecords.length >= 1) {
      return { success: false, message: "ใช้สิทธิ์ WFH ครบ 1 วัน/เดือนแล้ว" };
    }

    const existing = await prisma.wfhRecord.findUnique({
      where: { empId_date: { empId, date } },
    });

    if (existing) {
      return { success: false, message: "มีการขอ WFH วันนี้แล้ว" };
    }

    await prisma.wfhRecord.create({
      data: { empId, date, reason, status: "approved" },
    });

    revalidatePath("/wfh");
    revalidatePath("/employees");
    return { success: true, message: "ขอ WFH สำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function cancelWfh(id: number) {
  try {
    await prisma.wfhRecord.delete({ where: { id } });
    revalidatePath("/wfh");
    revalidatePath("/employees");
    return { success: true, message: "ยกเลิก WFH สำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function getWfhRecords(empId?: number) {
  const where = empId ? { empId } : {};
  return prisma.wfhRecord.findMany({
    where,
    include: { employee: true },
    orderBy: { date: "desc" },
  });
}

export async function getWfhOfMonth(empId: number) {
  const now = getThaiTime();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return prisma.wfhRecord.findMany({
    where: {
      empId,
      date: { startsWith: month },
      status: { not: "rejected" },
    },
  });
}

export async function isWfhDay(empId: number, date: string): Promise<boolean> {
  const record = await prisma.wfhRecord.findUnique({
    where: { empId_date: { empId, date } },
  });
  return record !== null && record.status !== "rejected";
}

export interface EmployeeStats {
  empId: number;
  name: string;
  groupType: string;
  totalDays: number;
  lateDays: number;
  onTimeDays: number;
  absentDays: number;
  leaveDays: number;
  wfhDays: number;
  totalWorkHours: number;
  avgCheckIn: string;
}

function getWorkDaysInRange(startDate: string, endDate: string): number {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function calcWorkHours(checkIn: string, checkOut: string): number {
  const [inH, inM] = checkIn.split(":").map(Number);
  const [outH, outM] = checkOut.split(":").map(Number);
  return (outH * 60 + outM - inH * 60 - inM) / 60;
}

function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0) {
      dates.push(
        `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`
      );
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function getAttendanceStats(
  startDate: string,
  endDate: string
): Promise<EmployeeStats[]> {
  const employees = await prisma.employee.findMany({ orderBy: { id: "asc" } });
  const workDates = getDatesInRange(startDate, endDate);

  const attendance = await prisma.attendanceLog.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    include: { employee: true },
  });

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      status: { not: "rejected" },
      OR: [
        { startDate: { lte: endDate }, endDate: { gte: startDate } },
      ],
    },
  });

  const wfhRecords = await prisma.wfhRecord.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      status: { not: "rejected" },
    },
  });

  return employees.map((emp) => {
    const empAttendance = attendance.filter((a) => a.empId === emp.id);
    const empLeaves = leaves.filter(
      (l) => l.empId === emp.id
    );
    const empWfh = wfhRecords.filter((w) => w.empId === emp.id);

    const lateDays = empAttendance.filter((a) => a.status === "late").length;
    const onTimeDays = empAttendance.filter((a) => a.status === "on_time").length;
    const wfhDays = empWfh.length;
    const leaveDays = empLeaves.length;

    const attendedDates = new Set(empAttendance.map((a) => a.date));
    const wfhDates = new Set(empWfh.map((w) => w.date));
    const absentDays = workDates.filter(
      (d) => !attendedDates.has(d) && !wfhDates.has(d)
    ).length;

    const totalWorkHours = empAttendance.reduce((sum, a) => {
      if (a.checkIn && a.checkOut) {
        return sum + calcWorkHours(a.checkIn, a.checkOut);
      }
      return sum;
    }, 0);

    const checkInTimes = empAttendance
      .map((a) => a.checkIn)
      .filter((c): c is string => c !== null);
    const avgCheckIn =
      checkInTimes.length > 0
        ? (() => {
            const totalMinutes = checkInTimes.reduce((sum, t) => {
              const [h, m] = t.split(":").map(Number);
              return sum + h * 60 + m;
            }, 0);
            const avg = Math.round(totalMinutes / checkInTimes.length);
            return `${String(Math.floor(avg / 60)).padStart(2, "0")}:${String(avg % 60).padStart(2, "0")}`;
          })()
        : "-";

    return {
      empId: emp.id,
      name: emp.name,
      groupType: emp.groupType,
      totalDays: lateDays + onTimeDays,
      lateDays,
      onTimeDays,
      absentDays: Math.max(0, absentDays - leaveDays),
      leaveDays,
      wfhDays,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      avgCheckIn,
    };
  });
}

export async function getMonthlySummary(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return getAttendanceStats(startDate, endDate);
}

export async function getEmployeeAttendanceHistory(
  empId: number,
  startDate: string,
  endDate: string
) {
  const attendance = await prisma.attendanceLog.findMany({
    where: {
      empId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
  });

  const wfhRecords = await prisma.wfhRecord.findMany({
    where: {
      empId,
      date: { gte: startDate, lte: endDate },
      status: { not: "rejected" },
    },
    orderBy: { date: "asc" },
  });

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      empId,
      status: { not: "rejected" },
      OR: [
        { startDate: { lte: endDate }, endDate: { gte: startDate } },
      ],
    },
    orderBy: { startDate: "asc" },
  });

  const workDates = getDatesInRange(startDate, endDate);
  const attendedDates = new Set(attendance.map((a) => a.date));
  const wfhDates = new Set(wfhRecords.map((w) => w.date));

  const dailyRecords = workDates.map((date) => {
    const att = attendance.find((a) => a.date === date);
    const isWfh = wfhDates.has(date);
    const isLeave = leaves.some(
      (l) => l.startDate <= date && l.endDate >= date
    );

    let status: string;
    if (att) {
      status = att.status === "late" ? "สาย" : "ตรงเวลา";
    } else if (isWfh) {
      status = "WFH";
    } else if (isLeave) {
      status = "ลา";
    } else {
      status = "ขาด";
    }

    return {
      date,
      checkIn: att?.checkIn || null,
      checkOut: att?.checkOut || null,
      status,
      workHours:
        att?.checkIn && att?.checkOut
          ? Math.round(calcWorkHours(att.checkIn, att.checkOut) * 100) / 100
          : null,
    };
  });

  return dailyRecords;
}

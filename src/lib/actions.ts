"use server";

import { prisma } from "@/lib/prisma";
import { getStatus, isTodaySunday, checkLocation, parseLatLong, calculateOTHours, isWeekend } from "@/lib/business-rules";
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

    let distanceInfo: string | undefined;

    if (!isWfh) {
      const officeLocation = await getActiveOfficeLocation();

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

    let distanceInfo: string | undefined;

    if (!isWfh) {
      const officeLocation = await getActiveOfficeLocation();

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

export async function getWfhOfMonthBulk(): Promise<Record<number, number>> {
  const now = getThaiTime();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const records = await prisma.wfhRecord.findMany({
    where: {
      date: { startsWith: month },
      status: { not: "rejected" },
    },
    select: { empId: true },
  });
  const usage: Record<number, number> = {};
  for (const r of records) {
    usage[r.empId] = (usage[r.empId] || 0) + 1;
  }
  return usage;
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
  const workDates = getDatesInRange(startDate, endDate);

  const [employees, attendance, leaves, wfhRecords] = await Promise.all([
    prisma.employee.findMany({ orderBy: { id: "asc" } }),
    prisma.attendanceLog.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { employee: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: { not: "rejected" },
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    }),
    prisma.wfhRecord.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: { not: "rejected" },
      },
    }),
  ]);

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
  const [attendance, wfhRecords, leaves] = await Promise.all([
    prisma.attendanceLog.findMany({
      where: {
        empId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    }),
    prisma.wfhRecord.findMany({
      where: {
        empId,
        date: { gte: startDate, lte: endDate },
        status: { not: "rejected" },
      },
      orderBy: { date: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: {
        empId,
        status: { not: "rejected" },
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

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

export async function getCompanyHolidays(year?: number) {
  const now = getThaiTime();
  const y = year || now.getFullYear();
  return prisma.companyHoliday.findMany({
    where: { year: y },
    orderBy: { date: "asc" },
  });
}

export async function addCompanyHoliday(date: string, name: string) {
  try {
    const year = parseInt(date.substring(0, 4));
    const existing = await prisma.companyHoliday.findUnique({
      where: { date },
    });
    if (existing) {
      return { success: false, message: "วันนี้ถูกบันทึกเป็นวันหยุดแล้ว" };
    }
    await prisma.companyHoliday.create({
      data: { date, name, year },
    });
    revalidatePath("/holidays");
    return { success: true, message: "เพิ่มวันหยุดสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function deleteCompanyHoliday(id: number) {
  try {
    await prisma.companyHoliday.delete({ where: { id } });
    revalidatePath("/holidays");
    return { success: true, message: "ลบวันหยุดสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function isCompanyHoliday(date: string): Promise<boolean> {
  const record = await prisma.companyHoliday.findUnique({
    where: { date },
  });
  return record !== null;
}

export async function getCompanyHolidaysInRange(startDate: string, endDate: string) {
  return prisma.companyHoliday.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
  });
}

export async function syncHolidaysFromApi(year: number) {
  try {
    const { fetchThaiHolidays } = await import("@/lib/thai-holidays");
    const holidays = await fetchThaiHolidays(year);

    let added = 0;
    let skipped = 0;

    for (const h of holidays) {
      const existing = await prisma.companyHoliday.findUnique({
        where: { date: h.date },
      });
      if (existing) {
        skipped++;
        continue;
      }
      const y = parseInt(h.date.substring(0, 4));
      await prisma.companyHoliday.create({
        data: { date: h.date, name: h.name, year: y },
      });
      added++;
    }

    revalidatePath("/holidays");
    return {
      success: true,
      message: `ดึงวันหยุดปี ${year} สำเร็จ: เพิ่ม ${added} วัน, ข้าม ${skipped} วัน (มีอยู่แล้ว)`,
      added,
      skipped,
    };
  } catch (error) {
    return {
      success: false,
      message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getAttendanceWithPhotos(startDate: string, endDate: string) {
  const records = await prisma.attendanceLog.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      OR: [
        { checkInPhoto: { not: null } },
        { checkOutPhoto: { not: null } },
      ],
    },
    include: { employee: true },
    orderBy: { date: "desc" },
  });

  return records.map((r) => ({
    id: r.id,
    date: r.date,
    employeeName: r.employee.name,
    groupType: r.employee.groupType,
    checkIn: r.checkIn,
    checkInPhoto: r.checkInPhoto,
    checkOut: r.checkOut,
    checkOutPhoto: r.checkOutPhoto,
    status: r.status,
    latLong: r.latLong,
  }));
}

export interface OtSummaryItem {
  empId: number;
  name: string;
  groupType: string;
  totalOtHours: number;
  otDays: number;
  details: { date: string; checkOut: string; otHours: number }[];
}

export async function getOtSummary(
  startDate: string,
  endDate: string
): Promise<OtSummaryItem[]> {
  const employees = await prisma.employee.findMany({ orderBy: { id: "asc" } });
  const records = await prisma.attendanceLog.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      checkOut: { not: null },
    },
  });

  return employees.map((emp) => {
    const empRecords = records.filter((r) => r.empId === emp.id);
    const details: { date: string; checkOut: string; otHours: number }[] = [];
    let totalOtHours = 0;

    for (const r of empRecords) {
      if (!r.checkOut) continue;
      const otHours = calculateOTHours(r.checkOut, emp.groupType);
      if (otHours > 0) {
        details.push({ date: r.date, checkOut: r.checkOut, otHours });
        totalOtHours += otHours;
      }
    }

    return {
      empId: emp.id,
      name: emp.name,
      groupType: emp.groupType,
      totalOtHours: Math.round(totalOtHours * 100) / 100,
      otDays: details.length,
      details,
    };
  });
}

export async function generateAttendanceReportPdf(
  startDate: string,
  endDate: string
): Promise<string> {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
  const employees = await prisma.employee.findMany({ orderBy: { id: "asc" } });
  const records = await prisma.attendanceLog.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    include: { employee: true },
  });
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      status: { not: "rejected" },
      OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
    },
  });
  const wfhRecords = await prisma.wfhRecord.findMany({
    where: { date: { gte: startDate, lte: endDate }, status: { not: "rejected" } },
  });

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontThai = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([842, 595]);
  const { width } = page.getSize();

  page.drawText("Attendance Summary Report", {
    x: 50,
    y: 550,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.3),
  });

  page.drawText(`${startDate} to ${endDate}`, {
    x: 50,
    y: 528,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  const headers = ["No.", "Name", "Group", "Late", "Absent", "Leave", "WFH", "Work Days"];
  const colX = [50, 80, 250, 300, 345, 390, 435, 490];
  const colW = [30, 170, 50, 45, 45, 45, 55, 80];

  let y = 500;
  headers.forEach((h, i) => {
    page.drawRectangle({
      x: colX[i],
      y: y - 5,
      width: colW[i],
      height: 18,
      color: rgb(0.15, 0.2, 0.35),
    });
    page.drawText(h, {
      x: colX[i] + 4,
      y: y,
      size: 8,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
  });

  y -= 25;

  const allDates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0) {
      allDates.push(
        `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`
      );
    }
    current.setDate(current.getDate() + 1);
  }

  employees.forEach((emp, idx) => {
    if (y < 50) return;

    const empRecords = records.filter((r) => r.empId === emp.id);
    const empLeaves = leaves.filter((l) => l.empId === emp.id);
    const empWfh = wfhRecords.filter((w) => w.empId === emp.id);

    const lateDays = empRecords.filter((r) => r.status === "late").length;
    const attendedDates = new Set(empRecords.map((r) => r.date));
    const wfhDates = new Set(empWfh.map((w) => w.date));

    let absentDays = 0;
    for (const d of allDates) {
      if (!attendedDates.has(d) && !wfhDates.has(d)) {
        const isLeave = empLeaves.some((l) => l.startDate <= d && l.endDate >= d);
        if (!isLeave) absentDays++;
      }
    }

    const leaveDays = empLeaves.reduce((sum, l) => {
      const lStart = new Date(Math.max(new Date(l.startDate).getTime(), new Date(startDate).getTime()));
      const lEnd = new Date(Math.min(new Date(l.endDate).getTime(), new Date(endDate).getTime()));
      const diff = Math.ceil((lEnd.getTime() - lStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + Math.max(0, diff);
    }, 0);

    const wfhDays = empWfh.length;
    const workDays = allDates.length - absentDays - leaveDays;

    const rowData = [
      String(idx + 1),
      emp.name,
      emp.groupType,
      String(lateDays),
      String(absentDays),
      String(leaveDays),
      String(wfhDays),
      String(workDays),
    ];

    if (idx % 2 === 0) {
      page.drawRectangle({
        x: 50,
        y: y - 5,
        width: width - 100,
        height: 18,
        color: rgb(0.95, 0.95, 0.97),
      });
    }

    rowData.forEach((text, i) => {
      page.drawText(text, {
        x: colX[i] + 4,
        y: y,
        size: 8,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    });

    y -= 20;
  });

  const pdfBytes = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}

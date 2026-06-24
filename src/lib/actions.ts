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
  leaveDetails: Record<string, number>;
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

    const leaveDetails: Record<string, number> = {};
    let leaveDays = 0;
    for (const l of empLeaves) {
      const lStart = new Date(Math.max(new Date(l.startDate).getTime(), new Date(startDate).getTime()));
      const lEnd = new Date(Math.min(new Date(l.endDate).getTime(), new Date(endDate).getTime()));
      const days = Math.ceil((lEnd.getTime() - lStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (days > 0) {
        leaveDays += days;
        leaveDetails[l.leaveType] = (leaveDetails[l.leaveType] || 0) + days;
      }
    }

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
      leaveDetails,
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
  endDate: string,
  empId?: number
): Promise<string> {
  try {
    const { PDFDocument, rgb } = await import("pdf-lib");

    const whereClause = empId ? { id: empId } : {};
    const employees = await prisma.employee.findMany({ where: whereClause, orderBy: { id: "asc" } });

    const records = await prisma.attendanceLog.findMany({
      where: {
        ...(empId ? { empId } : {}),
        date: { gte: startDate, lte: endDate },
      },
    });
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        ...(empId ? { empId } : {}),
        status: { not: "rejected" },
        OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
      },
    });
    let wfhRecords: { empId: number; date: string }[] = [];
    try {
      wfhRecords = await prisma.wfhRecord.findMany({
        where: {
          ...(empId ? { empId } : {}),
          date: { gte: startDate, lte: endDate },
          status: { not: "rejected" },
        },
      });
    } catch {
      wfhRecords = [];
    }

    const fs = await import("fs");
    const path = await import("path");
    const regularPath = path.join(process.cwd(), "public", "fonts", "Sarabun-Regular.ttf");
    const boldPath = path.join(process.cwd(), "public", "fonts", "Sarabun-Bold.ttf");
    const regularBytes = fs.readFileSync(regularPath);
    const boldBytes = fs.readFileSync(boldPath);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(regularBytes);
    const fontBold = await pdfDoc.embedFont(boldBytes);

  const PAGE_WIDTH = 842;
  const PAGE_HEIGHT = 595;
  const MARGIN_TOP = 50;
  const MARGIN_BOTTOM = 50;
  const ROW_HEIGHT = 20;
  const HEADER_HEIGHT = 18;

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

  function addPage(): { page: ReturnType<typeof pdfDoc.addPage>; y: number } {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN_TOP;

    page.drawText("รายงานสรุปการเข้างาน", {
      x: 50, y, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.3),
    });
    y -= 20;
    page.drawText(`${startDate} ถึง ${endDate}${empId ? " (รายบุคคล)" : ""}`, {
      x: 50, y, size: 10, font, color: rgb(0.4, 0.4, 0.4),
    });
    y -= 25;

    const headers = ["ลำดับ", "ชื่อ", "กลุ่ม", "สาย", "ขาด", "ลา", "WFH", "วันทำงาน"];
    const colX = [50, 80, 230, 310, 360, 410, 460, 520];

    page.drawRectangle({
      x: 50, y: y - 5, width: PAGE_WIDTH - 100, height: HEADER_HEIGHT,
      color: rgb(0.15, 0.2, 0.35),
    });
    headers.forEach((h, i) => {
      page.drawText(h, {
        x: colX[i] + 4, y, size: 8, font: fontBold, color: rgb(1, 1, 1),
      });
    });
    y -= 25;

    return { page, y };
  }

  let { page, y } = addPage();
  const colX = [50, 80, 230, 310, 360, 410, 460, 520];

  employees.forEach((emp, idx) => {
    if (y < MARGIN_BOTTOM + ROW_HEIGHT) {
      ({ page, y } = addPage());
    }

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

    if (idx % 2 === 0) {
      page.drawRectangle({
        x: 50, y: y - 5, width: PAGE_WIDTH - 100, height: ROW_HEIGHT,
        color: rgb(0.95, 0.95, 0.97),
      });
    }

    const rowData = [
      String(idx + 1), emp.name, emp.groupType,
      String(lateDays), String(absentDays), String(leaveDays),
      String(wfhDays), String(workDays),
    ];
    rowData.forEach((text, i) => {
      page.drawText(text, {
        x: colX[i] + 4, y, size: 8, font, color: rgb(0.1, 0.1, 0.1),
      });
    });

    y -= ROW_HEIGHT;
  });

  const pdfBytes = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ===== ONBOARDING ACTIONS =====

import { ONBOARDING_STEPS } from "@/lib/onboarding-constants";

export async function getOnboardingRecords() {
  return prisma.onboardingRecord.findMany({
    include: {
      employee: true,
      steps: { orderBy: { stepOrder: "asc" } },
      documents: true,
      equipment: true,
      training: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOnboardingRecord(empId: number) {
  return prisma.onboardingRecord.findUnique({
    where: { empId },
    include: {
      employee: true,
      steps: { orderBy: { stepOrder: "asc" } },
      documents: true,
      equipment: true,
      training: true,
    },
  });
}

export async function createOnboarding(empId: number, startDate: string) {
  try {
    const existing = await prisma.onboardingRecord.findUnique({ where: { empId } });
    if (existing) {
      return { success: false, message: "พนักงานคนนี้มีข้อมูล Onboarding แล้ว" };
    }

    const record = await prisma.onboardingRecord.create({
      data: {
        empId,
        startDate,
        steps: {
          create: ONBOARDING_STEPS.map((step, idx) => ({
            stepOrder: idx + 1,
            stepKey: step.key,
            stepLabel: step.label,
            isCompleted: false,
          })),
        },
      },
      include: { steps: true },
    });

    revalidatePath("/onboarding");
    return { success: true, message: "สร้างข้อมูล Onboarding สำเร็จ", data: record };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function completeOnboardingStep(empId: number, stepKey: string, completedBy?: string) {
  try {
    const record = await prisma.onboardingRecord.findUnique({ where: { empId } });
    if (!record) {
      return { success: false, message: "ไม่พบข้อมูล Onboarding" };
    }

    const step = await prisma.onboardingStep.findFirst({
      where: { onboardingId: record.id, stepKey },
    });

    if (!step) {
      return { success: false, message: "ไม่พบขั้นตอนที่ระบุ" };
    }

    await prisma.onboardingStep.update({
      where: { id: step.id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completedBy,
      },
    });

    const allSteps = await prisma.onboardingStep.findMany({
      where: { onboardingId: record.id },
    });
    const allCompleted = allSteps.every((s) => s.isCompleted);

    if (allCompleted) {
      await prisma.onboardingRecord.update({
        where: { id: record.id },
        data: { status: "completed", endDate: new Date().toISOString().split("T")[0] },
      });
    }

    revalidatePath("/onboarding");
    revalidatePath(`/onboarding/${empId}`);
    return { success: true, message: "บันทึกสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function updateOnboardingStatus(empId: number, status: "in_progress" | "completed" | "on_hold") {
  try {
    await prisma.onboardingRecord.update({
      where: { empId },
      data: { status },
    });
    revalidatePath("/onboarding");
    return { success: true, message: "อัพเดทสถานะสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function addOnboardingDocument(
  empId: number,
  docType: string,
  docLabel: string,
  fileUrl?: string,
  fileName?: string
) {
  try {
    const record = await prisma.onboardingRecord.findUnique({ where: { empId } });
    if (!record) {
      return { success: false, message: "ไม่พบข้อมูล Onboarding" };
    }

    await prisma.onboardingDocument.create({
      data: {
        onboardingId: record.id,
        docType,
        docLabel,
        fileUrl,
        fileName,
        status: fileUrl ? "submitted" : "pending",
      },
    });

    revalidatePath(`/onboarding/${empId}`);
    return { success: true, message: "เพิ่มเอกสารสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function verifyOnboardingDocument(docId: number, status: "verified" | "rejected", verifiedBy?: string) {
  try {
    await prisma.onboardingDocument.update({
      where: { id: docId },
      data: {
        status,
        verifiedAt: new Date(),
        verifiedBy,
      },
    });
    return { success: true, message: "ตรวจสอบเอกสารสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function addOnboardingEquipment(
  empId: number,
  equipType: string,
  equipName: string,
  serialNumber?: string,
  notes?: string
) {
  try {
    const record = await prisma.onboardingRecord.findUnique({ where: { empId } });
    if (!record) {
      return { success: false, message: "ไม่พบข้อมูล Onboarding" };
    }

    await prisma.onboardingEquipment.create({
      data: {
        onboardingId: record.id,
        equipType,
        equipName,
        serialNumber,
        notes,
        assignedAt: new Date(),
      },
    });

    revalidatePath(`/onboarding/${empId}`);
    return { success: true, message: "เพิ่มอุปกรณ์สำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function returnOnboardingEquipment(equipId: number) {
  try {
    await prisma.onboardingEquipment.update({
      where: { id: equipId },
      data: { returnedAt: new Date() },
    });
    return { success: true, message: "คืนอุปกรณ์สำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function addOnboardingTraining(
  empId: number,
  trainingName: string,
  trainer?: string,
  scheduledDate?: string
) {
  try {
    const record = await prisma.onboardingRecord.findUnique({ where: { empId } });
    if (!record) {
      return { success: false, message: "ไม่พบข้อมูล Onboarding" };
    }

    await prisma.onboardingTraining.create({
      data: {
        onboardingId: record.id,
        trainingName,
        trainer,
        scheduledDate,
        status: "scheduled",
      },
    });

    revalidatePath(`/onboarding/${empId}`);
    return { success: true, message: "เพิ่มการฝึกอบรมสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function completeOnboardingTraining(trainingId: number) {
  try {
    await prisma.onboardingTraining.update({
      where: { id: trainingId },
      data: {
        status: "completed",
        completedDate: new Date().toISOString().split("T")[0],
      },
    });
    return { success: true, message: "บันทึกสำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function deleteOnboarding(empId: number) {
  try {
    await prisma.onboardingRecord.delete({ where: { empId } });
    revalidatePath("/onboarding");
    return { success: true, message: "ลบข้อมูล Onboarding สำเร็จ" };
  } catch (error) {
    return { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function getOnboardingStats() {
  const records = await prisma.onboardingRecord.findMany({
    include: { steps: true },
  });

  const total = records.length;
  const inProgress = records.filter((r) => r.status === "in_progress").length;
  const completed = records.filter((r) => r.status === "completed").length;
  const onHold = records.filter((r) => r.status === "on_hold").length;

  return { total, inProgress, completed, onHold };
}

// ===== EMPLOYEE MONTHLY STATS =====

export interface EmployeeMonthlyStats {
  employee: { id: number; name: string; groupType: string };
  month: string;
  totalDays: number;
  lateDays: number;
  onTimeDays: number;
  absentDays: number;
  leaveDays: number;
  wfhDays: number;
  workDays: number;
  leaveDetails: Record<string, number>;
  history: {
    date: string;
    dayName: string;
    checkIn: string | null;
    checkOut: string | null;
    status: string;
    workHours: number | null;
    checkInPhoto: string | null;
    checkOutPhoto: string | null;
  }[];
}

export async function getEmployeeMonthlyStats(empId: number, year: number, month: number): Promise<EmployeeMonthlyStats | null> {
  const employee = await prisma.employee.findUnique({ where: { id: empId } });
  if (!employee) return null;

  const monthStr = String(month).padStart(2, "0");
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

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

  const [attendance, leaves, wfhRecords] = await Promise.all([
    prisma.attendanceLog.findMany({
      where: { empId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: {
        empId,
        status: { not: "rejected" },
        OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
      },
    }),
    prisma.wfhRecord.findMany({
      where: {
        empId,
        date: { gte: startDate, lte: endDate },
        status: { not: "rejected" },
      },
    }),
  ]);

  const lateDays = attendance.filter((a) => a.status === "late").length;
  const onTimeDays = attendance.filter((a) => a.status === "on_time").length;
  const wfhDates = new Set(wfhRecords.map((w) => w.date));
  const wfhDays = wfhRecords.length;

  const leaveDetails: Record<string, number> = {};
  let leaveDays = 0;
  for (const l of leaves) {
    const lStart = new Date(Math.max(new Date(l.startDate).getTime(), new Date(startDate).getTime()));
    const lEnd = new Date(Math.min(new Date(l.endDate).getTime(), new Date(endDate).getTime()));
    const days = Math.ceil((lEnd.getTime() - lStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days > 0) {
      leaveDays += days;
      leaveDetails[l.leaveType] = (leaveDetails[l.leaveType] || 0) + days;
    }
  }

  const attendedDates = new Set(attendance.map((a) => a.date));
  const absentDays = allDates.filter(
    (d) => !attendedDates.has(d) && !wfhDates.has(d) && !leaves.some((l) => l.startDate <= d && l.endDate >= d)
  ).length;

  const history = allDates.map((date) => {
    const att = attendance.find((a) => a.date === date);
    const d = new Date(date + "T00:00:00");
    const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    const dayName = dayNames[d.getDay()];

    let status: string;
    if (att) {
      status = att.status === "late" ? "สาย" : "ตรงเวลา";
    } else if (wfhDates.has(date)) {
      status = "WFH";
    } else if (leaves.some((l) => l.startDate <= date && l.endDate >= date)) {
      status = "ลา";
    } else {
      status = "ขาด";
    }

    return {
      date,
      dayName,
      checkIn: att?.checkIn || null,
      checkOut: att?.checkOut || null,
      status,
      workHours: att?.checkIn && att?.checkOut ? Math.round(calcWorkHours(att.checkIn, att.checkOut) * 100) / 100 : null,
      checkInPhoto: att?.checkInPhoto || null,
      checkOutPhoto: att?.checkOutPhoto || null,
    };
  });

  return {
    employee: { id: employee.id, name: employee.name, groupType: employee.groupType },
    month: `${year}-${monthStr}`,
    totalDays: allDates.length,
    lateDays,
    onTimeDays,
    absentDays,
    leaveDays,
    wfhDays,
    workDays: lateDays + onTimeDays + wfhDays,
    leaveDetails,
    history,
  };
}

// ===== EMPLOYEE WEEKLY STATS =====

export interface WeeklyDayItem {
  date: string;
  dayName: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workHours: number | null;
}

export async function getEmployeeWeeklyStats(empId: number): Promise<{ employee: { id: number; name: string; groupType: string }; weekStart: string; weekEnd: string; days: WeeklyDayItem[]; lateDays: number; onTimeDays: number; absentDays: number; workHours: number } | null> {
  const employee = await prisma.employee.findUnique({ where: { id: empId } });
  if (!employee) return null;

  const now = getThaiTime();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  const weekEnd = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;

  const allDates: string[] = [];
  const current = new Date(monday);
  const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    allDates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  const [attendance, leaves, wfhRecords] = await Promise.all([
    prisma.attendanceLog.findMany({
      where: { empId, date: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        empId,
        status: { not: "rejected" },
        OR: [{ startDate: { lte: weekEnd }, endDate: { gte: weekStart } }],
      },
    }),
    prisma.wfhRecord.findMany({
      where: {
        empId,
        date: { gte: weekStart, lte: weekEnd },
        status: { not: "rejected" },
      },
    }),
  ]);

  const wfhDates = new Set(wfhRecords.map((w) => w.date));
  let lateDays = 0;
  let onTimeDays = 0;
  let absentDays = 0;
  let totalWorkHours = 0;

  const days: WeeklyDayItem[] = allDates.map((date) => {
    const att = attendance.find((a) => a.date === date);
    const d = new Date(date + "T00:00:00");
    const dayName = dayNames[d.getDay()];

    let status: string;
    if (att) {
      status = att.status === "late" ? "สาย" : "ตรงเวลา";
      if (att.status === "late") lateDays++;
      else onTimeDays++;
    } else if (wfhDates.has(date)) {
      status = "WFH";
    } else if (leaves.some((l) => l.startDate <= date && l.endDate >= date)) {
      status = "ลา";
    } else {
      status = "ขาด";
      absentDays++;
    }

    const workHours = att?.checkIn && att?.checkOut ? Math.round(calcWorkHours(att.checkIn, att.checkOut) * 100) / 100 : null;
    if (workHours) totalWorkHours += workHours;

    return {
      date,
      dayName,
      checkIn: att?.checkIn || null,
      checkOut: att?.checkOut || null,
      status,
      workHours,
    };
  });

  return {
    employee: { id: employee.id, name: employee.name, groupType: employee.groupType },
    weekStart,
    weekEnd,
    days,
    lateDays,
    onTimeDays,
    absentDays,
    workHours: Math.round(totalWorkHours * 100) / 100,
  };
}

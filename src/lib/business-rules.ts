import { GroupType, AttendanceStatus } from "@/generated/prisma/enums";

export interface BusinessRule {
  workStart: string;
  workEnd: string;
  otStart?: string;
  otEnd?: string;
  lunchStart: string;
  lunchEnd: string;
  hasSaturdayRotation: boolean;
  canChooseOffDay: boolean;
}

export const BUSINESS_RULES: Record<GroupType, BusinessRule> = {
  A: {
    workStart: "08:00",
    workEnd: "17:00",
    lunchStart: "11:45",
    lunchEnd: "12:45",
    hasSaturdayRotation: true,
    canChooseOffDay: false,
  },
  B: {
    workStart: "07:00",
    workEnd: "16:00",
    otStart: "16:00",
    otEnd: "20:00",
    lunchStart: "11:45",
    lunchEnd: "12:45",
    hasSaturdayRotation: false,
    canChooseOffDay: true,
  },
};

export function isLate(checkInTime: string, groupType: GroupType): boolean {
  const rule = BUSINESS_RULES[groupType];
  const [h, m] = rule.workStart.split(":").map(Number);
  const [checkH, checkM] = checkInTime.split(":").map(Number);

  if (checkH > h) return true;
  if (checkH === h && checkM > m) return true;
  return false;
}

export function getStatus(checkInTime: string, groupType: GroupType): AttendanceStatus {
  return isLate(checkInTime, groupType) ? "late" : "on_time";
}

export function formatTime(time: string): string {
  return time.substring(0, 5);
}

function getThaiTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}

export function isTodaySunday(): boolean {
  return getThaiTime().getDay() === 0;
}

export function isTodaySaturday(): boolean {
  return getThaiTime().getDay() === 6;
}

export function getSundayDate(): string {
  const today = getThaiTime();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function getSaturdayDate(): string {
  const today = getThaiTime();
  const day = today.getDay();
  const diff = day === 6 ? 0 : 6 - day;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + diff);
  return `${saturday.getFullYear()}-${String(saturday.getMonth() + 1).padStart(2, "0")}-${String(saturday.getDate()).padStart(2, "0")}`;
}

export interface LocationCheckResult {
  withinRadius: boolean;
  distanceMeters: number;
  message: string;
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function checkLocation(
  userLat: number,
  userLon: number,
  officeLat: number,
  officeLon: number,
  radiusMeters: number
): LocationCheckResult {
  const distance = calculateDistance(userLat, userLon, officeLat, officeLon);
  const withinRadius = distance <= radiusMeters;

  return {
    withinRadius,
    distanceMeters: Math.round(distance),
    message: withinRadius
      ? `อยู่ในระยะ ${Math.round(distance)} เมตร`
      : `อยู่ห่าง ${Math.round(distance)} เมตร (เกินรัศมี ${radiusMeters} เมตร)`,
  };
}

export function parseLatLong(latLong: string): { lat: number; lon: number } | null {
  const match = latLong.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (!match) return null;
  return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
}

export function calculateOTHours(
  checkOutTime: string,
  groupType: GroupType
): number {
  const rule = BUSINESS_RULES[groupType];
  if (!rule.otStart || !rule.otEnd) return 0;

  const [otStartH, otStartM] = rule.otStart.split(":").map(Number);
  const [otEndH, otEndM] = rule.otEnd.split(":").map(Number);
  const [coH, coM] = checkOutTime.split(":").map(Number);

  const checkOutMinutes = coH * 60 + coM;
  const otStartMinutes = otStartH * 60 + otStartM;
  const otEndMinutes = otEndH * 60 + otEndM;

  if (checkOutMinutes <= otStartMinutes) return 0;
  if (checkOutMinutes >= otEndMinutes) {
    return (otEndMinutes - otStartMinutes) / 60;
  }
  return (checkOutMinutes - otStartMinutes) / 60;
}

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6;
}

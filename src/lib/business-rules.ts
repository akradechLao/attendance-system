import { GroupType, AttendanceStatus } from "@/generated/prisma/enums";

export interface BusinessRule {
  workStart: string;
  workEnd: string;
  otStart?: string;
  otEnd?: string;
  hasSaturdayRotation: boolean;
  canChooseOffDay: boolean;
}

export const BUSINESS_RULES: Record<GroupType, BusinessRule> = {
  A: {
    workStart: "08:00",
    workEnd: "17:00",
    hasSaturdayRotation: true,
    canChooseOffDay: false,
  },
  B: {
    workStart: "07:00",
    workEnd: "16:00",
    otStart: "17:00",
    otEnd: "20:00",
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

export function isTodaySunday(): boolean {
  return new Date().getDay() === 0;
}

export function isTodaySaturday(): boolean {
  return new Date().getDay() === 6;
}

export function getSundayDate(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export function getSaturdayDate(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 6 ? 0 : 6 - day;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + diff);
  return saturday.toISOString().split("T")[0];
}

export const LEAVE_TYPES: Record<string, { label: string; color: string; maxDays?: number; paid: boolean }> = {
  sick: { label: "ลาป่วย", color: "bg-red-100 text-red-800", maxDays: 30, paid: true },
  sick_unpaid: { label: "ลาป่วย (ไม่ได้ค่าจ้าง)", color: "bg-red-200 text-red-900", paid: false },
  personal: { label: "ลากิจ", color: "bg-blue-100 text-blue-800", maxDays: 6, paid: false },
  personal_paid: { label: "ลากิจ (ได้ค่าจ้าง)", color: "bg-blue-200 text-blue-900", maxDays: 10, paid: true },
  annual: { label: "ลาพักร้อน", color: "bg-green-100 text-green-800", maxDays: 6, paid: true },
  maternity: { label: "ลาคลอดบุตร", color: "bg-purple-100 text-purple-800", maxDays: 98, paid: true },
  ordination: { label: "ลาอุปสมบท", color: "bg-orange-100 text-orange-800", maxDays: 120, paid: true },
  workation: { label: "ลาหยุดพักผ่อนยาว", color: "bg-teal-100 text-teal-800", maxDays: 15, paid: true },
  errand: { label: "ลาไปทำธุระ", color: "bg-yellow-100 text-yellow-800", maxDays: 3, paid: false },
  training: { label: "ลาไปฝึกอบรม/สัมมนา", color: "bg-indigo-100 text-indigo-800", maxDays: 7, paid: true },
  training_long: { label: "ลาไปฝึกอบรม (เกิน 7 วัน)", color: "bg-indigo-200 text-indigo-900", maxDays: 5, paid: true },
};

export const TOTAL_LEAVE_QUOTAS: Record<string, number> = {
  sick: 30,
  personal: 10,
  annual: 6,
  maternity: 98,
  ordination: 120,
  workation: 15,
  errand: 3,
  training: 7,
  training_long: 5,
};

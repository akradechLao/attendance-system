export const ONBOARDING_STEPS = [
  { key: "personal_info", label: "ข้อมูลส่วนตัว", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { key: "documents", label: "เอกสาร", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { key: "benefits", label: "สิทธิประโยชน์", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "equipment", label: "อุปกรณ์", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { key: "training", label: "ฝึกอบรม", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { key: "team_intro", label: "แนะนำทีม", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { key: "policies", label: "ระเบียบบริษัท", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
] as const;

export const ONBOARDING_DOC_TYPES = [
  { key: "id_card", label: "สำเนาบัตรประชาชน" },
  { key: "education_cert", label: "สำเนาใบจบการศึกษา" },
  { key: "medical_cert", label: "ใบรับรองแพทย์" },
  { key: "house_registration", label: "สำเนาทะเบียนบ้าน" },
  { key: "photo", label: "รูปถ่าย 1 นิ้ว" },
  { key: "bank_account", label: "สำเนาสมุดบัญชีธนาคาร" },
] as const;

export const ONBOARDING_EQUIPMENT_TYPES = [
  { key: "laptop", label: "โน้ตบุ๊ค" },
  { key: "monitor", label: "จอมอนิเตอร์" },
  { key: "keyboard", label: "คีย์บอร์ด" },
  { key: "mouse", label: "เมาส์" },
  { key: "headset", label: "หูฟัง" },
  { key: "phone", label: "โทรศัพท์มือถือ" },
  { key: "id_card", label: "บัตรเข้าอาคาร" },
  { key: "key", label: "กุญแจ" },
  { key: "other", label: "อื่นๆ" },
] as const;

export const ONBOARDING_STATUS: Record<string, { label: string; color: string }> = {
  in_progress: { label: "กำลังดำเนินการ", color: "bg-yellow-100 text-yellow-800" },
  completed: { label: "เสร็จสมบูรณ์", color: "bg-green-100 text-green-800" },
  on_hold: { label: "ระงับชั่วคราว", color: "bg-gray-100 text-gray-800" },
};

export const ONBOARDING_DOC_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "รอส่ง", color: "bg-gray-100 text-gray-800" },
  submitted: { label: "ส่งแล้ว", color: "bg-blue-100 text-blue-800" },
  verified: { label: "ตรวจสอบแล้ว", color: "bg-green-100 text-green-800" },
  rejected: { label: "ไม่ผ่าน", color: "bg-red-100 text-red-800" },
};

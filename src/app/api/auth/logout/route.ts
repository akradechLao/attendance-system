import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST() {
  await clearAdminSession();

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  sendTelegramMessage(`🔓 <b>Admin Logout</b> - ${time}`);

  return NextResponse.json({ success: true, redirect: "/login" });
}

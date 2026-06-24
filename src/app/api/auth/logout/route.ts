import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";

const SESSION_COOKIE = "admin_session";

export async function POST() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  sendTelegramMessage(`🔓 <b>Admin Logout</b> - ${time}`);

  const response = NextResponse.json({ success: true, redirect: "/login" });
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });

  return response;
}

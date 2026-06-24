import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";

const SESSION_COOKIE = "admin_session";
const SESSION_SECRET = "hr-attendance-admin-2024";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "กรุณากรอก username และ password" },
        { status: 400 }
      );
    }

    if (!verifyCredentials(username, password)) {
      return NextResponse.json(
        { success: false, message: "Username หรือ Password ไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    sendTelegramMessage(`🔐 <b>Admin Login</b> - ${time}`);

    const response = NextResponse.json({
      success: true,
      message: "Login สำเร็จ",
      redirect: "/",
    });

    response.cookies.set(SESSION_COOKIE, SESSION_SECRET, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

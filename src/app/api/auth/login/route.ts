import { NextRequest, NextResponse } from "next/server";
import { setAdminSession, verifyCredentials } from "@/lib/auth";

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

    await setAdminSession();

    return NextResponse.json({
      success: true,
      message: "Login สำเร็จ",
      redirect: "/",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

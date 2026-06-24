import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "admin_session";
const SESSION_SECRET = "hr-attendance-admin-2024";

export async function GET(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE);
  
  if (session?.value === SESSION_SECRET) {
    return NextResponse.json({ loggedIn: true });
  }
  
  return NextResponse.json({ loggedIn: false });
}

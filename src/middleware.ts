import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "admin_session";
const SESSION_SECRET = "hr-attendance-admin-2024";

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE);
  const isLoggedIn = session?.value === SESSION_SECRET;

  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (request.nextUrl.pathname.startsWith("/api/auth/login") || request.nextUrl.pathname.startsWith("/api/auth/me")) {
      return NextResponse.next();
    }
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isEmployeePage = request.nextUrl.pathname === "/employee" || request.nextUrl.pathname.startsWith("/employee/");

  if (!isLoggedIn && request.nextUrl.pathname !== "/login" && !isEmployeePage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoggedIn && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icons/|manifest.json|sw.js|favicon.ico).*)"],
};

import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const session = request.cookies.get("admin_session");
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isApiAuth = request.nextUrl.pathname.startsWith("/api/auth");
  const isEmployeePage = request.nextUrl.pathname === "/employee";

  if (isApiAuth || isEmployeePage) {
    return NextResponse.next();
  }

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

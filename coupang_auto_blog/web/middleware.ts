import { NextResponse, type NextRequest } from "next/server";

// 프로덕션에서는 BYPASS 모드 비활성화
const BYPASS = process.env.NODE_ENV !== "production" && process.env.ADMIN_GUARD_BYPASS === "true";
const ADMIN_SESSION_COOKIE = "admin_session";

export function middleware(request: NextRequest) {
  if (BYPASS) {
    console.log("[개발 모드] Admin guard bypass 활성화");
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname.startsWith("/admin/login");

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  if (isLoginRoute) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(ADMIN_SESSION_COOKIE);

  if (hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};

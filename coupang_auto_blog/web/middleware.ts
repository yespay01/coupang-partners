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
  const isAdminRootRoute = pathname === "/admin";

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(ADMIN_SESSION_COOKIE);

  // 로그인 완료 상태에서 /admin/login 접근 시 대시보드로 이동
  if (isLoginRoute && hasSession) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // 비로그인 상태에서 /admin 접근 시 URL은 /admin 유지한 채 로그인 화면 표시
  if (isAdminRootRoute && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    return NextResponse.rewrite(loginUrl);
  }

  if (isLoginRoute) {
    return NextResponse.next();
  }

  if (hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};

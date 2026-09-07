import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

const DATE_RANGE_MAP: Record<string, string> = {
  "24h": "1d",
  "7d": "7d",
  "30d": "30d",
  all: "31d",
};

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const requestedRange = request.nextUrl.searchParams.get("dateRange") || "30d";
    const dateRange = DATE_RANGE_MAP[requestedRange] || "30d";
    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/analytics/optimization?dateRange=${dateRange}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: `admin_session=${sessionCookie.value}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json().catch(() => ({
      success: false,
      error: "Optimization API returned an invalid response",
    }));

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Optimization analytics fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");
    const authorization = request.headers.get("authorization");
    if (!sessionCookie && !authorization) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/admin/credentials/naver-sa/snapshot`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authorization
            ? { Authorization: authorization }
            : { Cookie: `admin_session=${sessionCookie!.value}` }),
        },
        body: JSON.stringify(await request.json()),
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status, headers: CORS_HEADERS });
  } catch (error) {
    console.error("Naver SA snapshot sync error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

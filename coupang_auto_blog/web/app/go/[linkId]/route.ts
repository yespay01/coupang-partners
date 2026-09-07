import { NextRequest, NextResponse } from "next/server";
import {
  analyticsIdentityHeaders,
  applyAnalyticsCookies,
  getAnalyticsIdentity,
} from "@/lib/analyticsServer";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9:_-]{1,30}$/;
const CONTENT_ID_PATTERN = /^[\p{L}\p{N}._:-]{1,120}$/u;
const SURFACES = new Set([
  "home",
  "collection",
  "detail",
  "legacy_detail",
  "search",
  "recipe",
  "other",
]);

type RouteContext = { params: Promise<{ linkId: string }> };

function copyAllowedContext(request: NextRequest): URLSearchParams {
  const output = new URLSearchParams();
  const pv = request.nextUrl.searchParams.get("pv");
  const surface = request.nextUrl.searchParams.get("surface");
  const position = request.nextUrl.searchParams.get("position");
  const contentId = request.nextUrl.searchParams.get("content_id");
  const productId = request.nextUrl.searchParams.get("product_id");

  if (pv && UUID_V4_PATTERN.test(pv)) output.set("pv", pv);
  if (surface && SURFACES.has(surface)) output.set("surface", surface);
  if (position && TOKEN_PATTERN.test(position)) output.set("position", position);
  if (contentId && CONTENT_ID_PATTERN.test(contentId)) {
    output.set("content_id", contentId);
  }
  if (productId && TOKEN_PATTERN.test(productId)) output.set("product_id", productId);
  return output;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { linkId } = await params;
  if (!UUID_V4_PATTERN.test(linkId)) {
    return NextResponse.json({ success: false, error: "invalid_link_id" }, { status: 400 });
  }

  try {
    const identity = getAnalyticsIdentity(request);
    const userAgent = (request.headers.get("user-agent") || "").slice(0, 512);
    const query = copyAllowedContext(request);
    const upstreamUrl = `${AUTOMATION_SERVER_URL}/api/go/${encodeURIComponent(linkId)}${
      query.size ? `?${query.toString()}` : ""
    }`;
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: analyticsIdentityHeaders(identity, userAgent),
      redirect: "manual",
      cache: "no-store",
    });
    const location = upstream.headers.get("location");

    if (!location || upstream.status < 300 || upstream.status >= 400) {
      return NextResponse.json(
        { success: false, error: "affiliate_redirect_unavailable" },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }

    const response = NextResponse.redirect(location, 302);
    applyAnalyticsCookies(response, identity);
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "affiliate_redirect_unavailable" },
      { status: 502 }
    );
  }
}

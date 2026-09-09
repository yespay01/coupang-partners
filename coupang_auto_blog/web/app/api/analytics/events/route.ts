import { NextRequest, NextResponse } from "next/server";
import {
  analyticsIdentityHeaders,
  applyAnalyticsCookies,
  getAnalyticsIdentity,
} from "@/lib/analyticsServer";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";
const MAX_BODY_BYTES = 32 * 1024;
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_NAMES = new Set([
  "page_view",
  "list_view",
  "product_card_impression",
  "cta_impression",
]);
const SURFACES = new Set([
  "home",
  "collection",
  "related",
  "detail",
  "legacy_detail",
  "search",
  "recipe",
  "other",
]);
const TOKEN_PATTERN = /^[A-Za-z0-9:_-]{1,80}$/;

function optionalText(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength
    ? value
    : undefined;
}

function normalizeEvent(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const event = value as Record<string, unknown>;
  if (
    typeof event.event_id !== "string" ||
    !UUID_V4_PATTERN.test(event.event_id) ||
    typeof event.page_view_id !== "string" ||
    !UUID_V4_PATTERN.test(event.page_view_id) ||
    typeof event.event_name !== "string" ||
    !EVENT_NAMES.has(event.event_name) ||
    typeof event.surface !== "string" ||
    !SURFACES.has(event.surface) ||
    typeof event.occurred_at !== "string" ||
    Number.isNaN(Date.parse(event.occurred_at))
  ) {
    return null;
  }

  const position = optionalText(event.position, 30);
  const productId = optionalText(event.product_id, 80);
  const linkId = optionalText(event.link_id, 36);
  if (position && !TOKEN_PATTERN.test(position)) return null;
  if (productId && !TOKEN_PATTERN.test(productId)) return null;
  if (linkId && !UUID_V4_PATTERN.test(linkId)) return null;

  return {
    event_id: event.event_id,
    event_name: event.event_name,
    occurred_at: event.occurred_at,
    page_view_id: event.page_view_id,
    surface: event.surface,
    content_id: optionalText(event.content_id, 120),
    product_id: productId,
    position,
    link_id: linkId,
    source: optionalText(event.source, 120),
  };
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, error: "payload_too_large" }, { status: 413 });
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, error: "payload_too_large" }, { status: 413 });
    }

    const body = JSON.parse(rawBody);
    if (
      body?.schema_version !== 1 ||
      !Array.isArray(body.events) ||
      body.events.length < 1 ||
      body.events.length > 20
    ) {
      return NextResponse.json({ success: false, error: "invalid_event_batch" }, { status: 400 });
    }
    const normalizedEvents = body.events.map(normalizeEvent);
    if (normalizedEvents.some((event: unknown) => event === null)) {
      return NextResponse.json({ success: false, error: "invalid_event" }, { status: 400 });
    }

    const identity = getAnalyticsIdentity(request);
    const userAgent = (request.headers.get("user-agent") || "").slice(0, 512);
    const upstream = await fetch(`${AUTOMATION_SERVER_URL}/api/analytics/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...analyticsIdentityHeaders(identity, userAgent),
      },
      body: JSON.stringify({ schema_version: 1, events: normalizedEvents }),
      cache: "no-store",
    });

    const payload = await upstream.json().catch(() => ({
      success: false,
      error: "invalid_upstream_response",
    }));
    const response = NextResponse.json(payload, { status: upstream.status });
    applyAnalyticsCookies(response, identity);
    return response;
  } catch {
    return NextResponse.json({ success: false, error: "analytics_unavailable" }, { status: 502 });
  }
}

export const ANALYTICS_SCHEMA_VERSION = 1 as const;

export type AnalyticsEventName =
  | "page_view"
  | "list_view"
  | "product_card_impression"
  | "cta_impression";

export type AnalyticsSurface =
  | "home"
  | "collection"
  | "related"
  | "detail"
  | "legacy_detail"
  | "search"
  | "recipe"
  | "other";

export type AnalyticsEventInput = {
  eventName: AnalyticsEventName;
  surface: AnalyticsSurface;
  contentId?: string;
  productId?: string;
  position?: string;
  linkId?: string;
  source?: string;
};

type PageViewState = {
  locationKey: string;
  pageViewId: string;
};

let pageViewState: PageViewState | null = null;
const pendingEvents: Array<Record<string, unknown>> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sendChain: Promise<void> = Promise.resolve();

function flushEvents(): void {
  flushTimer = null;
  const events = pendingEvents.splice(0, 20);
  if (events.length === 0) return;

  sendChain = sendChain
    .catch(() => {})
    .then(async () => {
      await fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          schema_version: ANALYTICS_SCHEMA_VERSION,
          events,
        }),
      });
    })
    .catch(() => {});

  if (pendingEvents.length > 0 && !flushTimer) {
    flushTimer = setTimeout(flushEvents, 0);
  }
}

function createEventId(): string | null {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return null;
}

export function getPageViewId(locationKey?: string): string | null {
  const currentLocation =
    locationKey ??
    (typeof window === "undefined"
      ? "server"
      : `${window.location.pathname}${window.location.search}`);

  if (!pageViewState || pageViewState.locationKey !== currentLocation) {
    const pageViewId = createEventId();
    if (!pageViewId) return null;
    pageViewState = {
      locationKey: currentLocation,
      pageViewId,
    };
  }

  return pageViewState.pageViewId;
}

export function getAnalyticsSurface(pathname: string): AnalyticsSurface {
  if (pathname === "/" || pathname === "") return "home";
  if (pathname.startsWith("/reviews/")) return "detail";
  if (pathname.startsWith("/products/")) return "detail";
  if (pathname === "/reviews" || pathname === "/recipes") return "collection";
  if (pathname.startsWith("/review/")) return "legacy_detail";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/recipes/")) return "recipe";
  if (pathname.startsWith("/collections/")) return "collection";
  return "other";
}

export function sendAnalyticsEvent(input: AnalyticsEventInput): void {
  if (typeof window === "undefined") return;

  const locationKey = `${window.location.pathname}${window.location.search}`;
  const eventId = createEventId();
  const pageViewId = getPageViewId(locationKey);
  if (!eventId || !pageViewId) return;
  const event = {
    event_id: eventId,
    event_name: input.eventName,
    occurred_at: new Date().toISOString(),
    page_view_id: pageViewId,
    surface: input.surface,
    content_id: input.contentId,
    product_id: input.productId,
    position: input.position,
    link_id: input.linkId,
    source: input.source,
  };

  pendingEvents.push(event);
  if (!flushTimer) flushTimer = setTimeout(flushEvents, 0);
}

export function buildGoUrl(
  linkId: string,
  context: Omit<AnalyticsEventInput, "eventName" | "linkId">
): string {
  const params = new URLSearchParams();
  const pageViewId = getPageViewId();
  if (pageViewId) params.set("pv", pageViewId);
  params.set("surface", context.surface);
  if (context.position) params.set("position", context.position);
  if (context.contentId) params.set("content_id", context.contentId);
  if (context.productId) params.set("product_id", context.productId);

  return `/go/${encodeURIComponent(linkId)}?${params.toString()}`;
}

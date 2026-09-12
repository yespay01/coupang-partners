"use client";

import type { ComponentPropsWithoutRef } from "react";
import { usePathname } from "next/navigation";
import { useAnalyticsImpression } from "@/hooks/useAnalyticsImpression";
import {
  buildGoUrl,
  buildGoUrlWithoutPageView,
  getAnalyticsSurface,
  type AnalyticsEventName,
  type AnalyticsSurface,
} from "@/lib/analytics";

export const COUPANG_AFFILIATE_REL =
  "sponsored nofollow noopener noreferrer" as const;

export type AffiliateClickContext = {
  reviewId?: string;
  reviewSlug?: string;
  productName?: string;
  productId?: string;
  contentId?: string;
  surface?: AnalyticsSurface;
  position: string;
};

type AffiliateOutboundLinkProps = Omit<
  ComponentPropsWithoutRef<"a">,
  "href" | "rel" | "target"
> & {
  href?: string;
  linkId?: string;
  tracking?: AffiliateClickContext;
  impressionEventName?: Extract<
    AnalyticsEventName,
    "product_card_impression" | "cta_impression"
  >;
};

export function AffiliateOutboundLink({
  href,
  linkId,
  tracking,
  impressionEventName = "cta_impression",
  onClick,
  children,
  ...props
}: AffiliateOutboundLinkProps) {
  const pathname = usePathname();
  const surface = tracking?.surface ?? getAnalyticsSurface(pathname);
  const goContext = {
    surface,
    contentId: tracking?.contentId ?? tracking?.reviewSlug,
    productId: tracking?.productId,
    position: tracking?.position,
  };
  const impressionRef = useAnalyticsImpression<HTMLAnchorElement>({
    eventName: impressionEventName,
    surface,
    contentId: tracking?.contentId ?? tracking?.reviewSlug,
    productId: tracking?.productId,
    position: tracking?.position,
    linkId,
  });

  const handleClick: AffiliateOutboundLinkProps["onClick"] = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    if (linkId) {
      event.currentTarget.href = buildGoUrl(linkId, goContext);
      return;
    }

    if (!tracking) return;

    // linkId 발급 전 기존 클릭 로그와 이중 기록한다.
    try {
      fetch("/api/track/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          review_id: tracking.reviewId ?? null,
          review_slug: tracking.reviewSlug ?? null,
          product_name: tracking.productName ?? null,
          position: tracking.position,
          page_url: window.location.pathname,
          referrer: document.referrer || null,
        }),
      }).catch(() => {});
    } catch {
      // 추적 실패는 상품 이동을 막지 않는다.
    }
  };

  return (
    <a
      {...props}
      ref={impressionRef}
      href={linkId ? buildGoUrlWithoutPageView(linkId, goContext) : href}
      target="_blank"
      rel={COUPANG_AFFILIATE_REL}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}

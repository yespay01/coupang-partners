"use client";

import type { ReactNode } from "react";
import { useAnalyticsImpression } from "@/hooks/useAnalyticsImpression";
import type { AnalyticsEventInput } from "@/lib/analytics";

export function ImpressionBoundary({
  event,
  className,
  children,
}: {
  event: AnalyticsEventInput;
  className?: string;
  children: ReactNode;
}) {
  const impressionRef = useAnalyticsImpression<HTMLDivElement>(event);

  return (
    <div ref={impressionRef} className={className}>
      {children}
    </div>
  );
}

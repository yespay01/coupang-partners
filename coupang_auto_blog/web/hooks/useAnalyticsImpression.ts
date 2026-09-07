"use client";

import { useEffect, useRef } from "react";
import {
  sendAnalyticsEvent,
  type AnalyticsEventInput,
} from "@/lib/analytics";

export function useAnalyticsImpression<T extends HTMLElement = HTMLElement>(
  event: AnalyticsEventInput,
  options: { threshold?: number; minimumVisibleMs?: number } = {}
) {
  const elementRef = useRef<T | null>(null);
  const sentRef = useRef(false);
  const eventRef = useRef(event);
  eventRef.current = event;

  useEffect(() => {
    const element = elementRef.current;
    if (!element || sentRef.current || typeof IntersectionObserver === "undefined") {
      return;
    }

    let visibleTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (sentRef.current) return;

        if (entry.isIntersecting && entry.intersectionRatio >= (options.threshold ?? 0.5)) {
          if (!visibleTimer) {
            visibleTimer = setTimeout(() => {
              sentRef.current = true;
              sendAnalyticsEvent(eventRef.current);
              observer.disconnect();
            }, options.minimumVisibleMs ?? 1000);
          }
        } else if (visibleTimer) {
          clearTimeout(visibleTimer);
          visibleTimer = null;
        }
      },
      { threshold: [options.threshold ?? 0.5] }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      if (visibleTimer) clearTimeout(visibleTimer);
    };
  }, [options.minimumVisibleMs, options.threshold]);

  return elementRef;
}

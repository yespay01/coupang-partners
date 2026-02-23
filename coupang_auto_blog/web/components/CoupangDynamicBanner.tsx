"use client";

import { useEffect, useRef } from "react";

const G_JS_URL = "https://ads-partners.coupang.com/g.js";
const WIDGET_SCRIPT = `new PartnersCoupang.G({"id":967328,"template":"carousel","trackingCode":"AF7225079","width":"680","height":"140","tsource":""});`;

// 모듈 수준 싱글톤 — 동시에 하나만 존재
let activeCleanup: (() => void) | null = null;

export function CoupangDynamicBanner({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 이전 인스턴스 먼저 정리 (StrictMode 이중 실행, 재탐색 모두 처리)
    activeCleanup?.();
    activeCleanup = null;

    let iframes: HTMLElement[] = [];
    let widgetScript: HTMLScriptElement | null = null;
    let observer: MutationObserver | null = null;
    let observerTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (observerTimer) clearTimeout(observerTimer);
      observer?.disconnect();
      observer = null;
      iframes.forEach((el) => el.parentNode?.removeChild(el));
      iframes = [];
      widgetScript?.parentNode?.removeChild(widgetScript);
      widgetScript = null;
      if (activeCleanup === cleanup) activeCleanup = null;
    };

    activeCleanup = cleanup;

    const injectWidget = () => {
      if (!(window as any).PartnersCoupang || !containerRef.current) return;

      // body에 추가되는 iframe을 3초간 감지
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if ((node as HTMLElement).nodeName === "IFRAME") {
              const el = node as HTMLElement;
              iframes.push(el);
              containerRef.current?.appendChild(el);
            }
          }
        }
      });
      observer.observe(document.body, { childList: true });

      // 3초 후 observer 해제 (광고 로딩 충분한 여유)
      observerTimer = setTimeout(() => {
        observer?.disconnect();
        observer = null;
      }, 3000);

      widgetScript = document.createElement("script");
      widgetScript.setAttribute("data-coupang-widget", "true");
      widgetScript.text = WIDGET_SCRIPT;
      document.body.appendChild(widgetScript);
    };

    const tryInit = () => {
      if ((window as any).PartnersCoupang) {
        injectWidget();
        return;
      }
      let tries = 0;
      const timer = setInterval(() => {
        tries++;
        if ((window as any).PartnersCoupang) {
          clearInterval(timer);
          injectWidget();
        } else if (tries > 50) {
          clearInterval(timer);
          console.warn("CoupangDynamicBanner: PartnersCoupang 로드 실패");
        }
      }, 100);
    };

    const existing = document.querySelector(`script[src="${G_JS_URL}"]`);
    if (!existing) {
      const gScript = document.createElement("script");
      gScript.src = G_JS_URL;
      gScript.async = true;
      gScript.onload = tryInit;
      gScript.onerror = () => console.error("CoupangDynamicBanner: g.js 로드 실패");
      document.head.appendChild(gScript);
    } else {
      tryInit();
    }

    return cleanup;
  }, []);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        style={{ width: "100%", maxWidth: "680px", height: "140px", margin: "0 auto" }}
      />
      <p className="mt-1 text-center text-xs text-slate-400">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
}

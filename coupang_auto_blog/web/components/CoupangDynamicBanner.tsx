"use client";

import { useEffect, useRef } from "react";

interface CoupangDynamicBannerProps {
  className?: string;
}

const G_JS_URL = "https://ads-partners.coupang.com/g.js";
const WIDGET_SCRIPT = `new PartnersCoupang.G({"id":967328,"template":"carousel","trackingCode":"AF7225079","width":"680","height":"140","tsource":""});`;

export function CoupangDynamicBanner({ className = "" }: CoupangDynamicBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let iframeEl: HTMLElement | null = null;
    let widgetScript: HTMLScriptElement | null = null;
    let observer: MutationObserver | null = null;

    const injectWidget = () => {
      if (!(window as any).PartnersCoupang || !containerRef.current) return;

      // body에 추가되는 iframe을 감지해 container로 이동
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if ((node as HTMLElement).nodeName === "IFRAME") {
              observer?.disconnect();
              observer = null;
              iframeEl = node as HTMLElement;
              if (containerRef.current) {
                containerRef.current.appendChild(iframeEl);
              }
              return;
            }
          }
        }
      });
      observer.observe(document.body, { childList: true });

      widgetScript = document.createElement("script");
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
          console.warn("CoupangDynamicBanner: 로드 실패");
        }
      }, 100);
    };

    // g.js 로드 (이미 로드됐으면 재사용)
    const existingScript = document.querySelector(`script[src="${G_JS_URL}"]`);
    if (!existingScript) {
      const gScript = document.createElement("script");
      gScript.src = G_JS_URL;
      gScript.async = true;
      gScript.onload = tryInit;
      gScript.onerror = () => console.error("CoupangDynamicBanner: g.js 로드 실패");
      document.head.appendChild(gScript);
    } else {
      tryInit();
    }

    // 페이지 이동 시 cleanup — iframe/script body에서 제거
    return () => {
      observer?.disconnect();
      iframeEl?.parentNode?.removeChild(iframeEl);
      widgetScript?.parentNode?.removeChild(widgetScript);
    };
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

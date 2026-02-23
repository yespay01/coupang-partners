"use client";

import { useEffect, useRef } from "react";

interface CoupangDynamicBannerProps {
  className?: string;
}

const G_JS_URL = "https://ads-partners.coupang.com/g.js";

export function CoupangDynamicBanner({ className = "" }: CoupangDynamicBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !containerRef.current) return;
    initialized.current = true;

    const injectWidget = () => {
      if (!(window as any).PartnersCoupang || !containerRef.current) return;

      // iframe이 body에 추가되는 순간 캐치해서 container로 이동
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if ((node as HTMLElement).nodeName === "IFRAME") {
              observer.disconnect();
              if (containerRef.current) {
                containerRef.current.prepend(node as HTMLElement);
              }
              return;
            }
          }
        }
      });
      observer.observe(document.body, { childList: true });

      // 위젯 스크립트 실행
      const s = document.createElement("script");
      s.text = `new PartnersCoupang.G({"id":967328,"template":"carousel","trackingCode":"AF7225079","width":"680","height":"140","tsource":""});`;
      document.body.appendChild(s);
    };

    const tryInit = () => {
      if ((window as any).PartnersCoupang) {
        injectWidget();
      } else {
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
      }
    };

    const w = window as any;
    if (!w.__coupangGLoaded__) {
      w.__coupangGLoaded__ = true;
      const gScript = document.createElement("script");
      gScript.src = G_JS_URL;
      gScript.async = true;
      gScript.onload = tryInit;
      gScript.onerror = () => console.error("CoupangDynamicBanner: g.js 로드 실패");
      document.head.appendChild(gScript);
    } else {
      tryInit();
    }
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

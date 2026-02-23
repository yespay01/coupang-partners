"use client";

import { useEffect, useRef } from "react";

interface CoupangDynamicBannerProps {
  className?: string;
}

const WIDGET_CONFIG = {
  id: 967328,
  template: "carousel",
  trackingCode: "AF7225079",
  width: "100%",
  height: "140",
  tsource: "",
};

const G_JS_URL = "https://ads-partners.coupang.com/g.js";
const LOADED_FLAG = "__coupangGLoaded__";

export function CoupangDynamicBanner({ className = "" }: CoupangDynamicBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !containerRef.current) return;
    initialized.current = true;

    // PartnersCoupang 준비되면 위젯 스크립트 삽입
    const initWidget = () => {
      const w = window as any;
      if (!w.PartnersCoupang) {
        // 최대 5초까지 100ms 간격으로 재시도
        let tries = 0;
        const timer = setInterval(() => {
          tries++;
          if (w.PartnersCoupang && containerRef.current) {
            clearInterval(timer);
            injectScript();
          } else if (tries > 50) {
            clearInterval(timer);
            console.warn("CoupangDynamicBanner: PartnersCoupang 로드 실패");
          }
        }, 100);
      } else {
        injectScript();
      }
    };

    const injectScript = () => {
      if (!containerRef.current) return;
      const s = document.createElement("script");
      s.text = `new PartnersCoupang.G(${JSON.stringify(WIDGET_CONFIG)});`;
      containerRef.current.appendChild(s);
    };

    // g.js 로드
    const w = window as any;
    if (!w[LOADED_FLAG]) {
      w[LOADED_FLAG] = true;
      const gScript = document.createElement("script");
      gScript.src = G_JS_URL;
      gScript.async = true;
      gScript.onload = initWidget;
      gScript.onerror = () => {
        console.error("CoupangDynamicBanner: g.js 로드 실패");
      };
      document.head.appendChild(gScript);
    } else {
      initWidget();
    }
  }, []);

  return (
    <div className={className}>
      <div ref={containerRef} style={{ width: "100%", minHeight: "140px" }} />
      <p className="mt-1 text-center text-xs text-slate-400">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
}

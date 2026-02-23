"use client";

import { useEffect, useRef } from "react";

interface CoupangDynamicBannerProps {
  className?: string;
}

export function CoupangDynamicBanner({ className = "" }: CoupangDynamicBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !containerRef.current) return;
    initialized.current = true;

    const initWidget = () => {
      if (!(window as any).PartnersCoupang || !containerRef.current) return;
      const script = document.createElement("script");
      script.innerHTML = `new PartnersCoupang.G({"id":967328,"template":"carousel","trackingCode":"AF7225079","width":"100%","height":"140","tsource":""});`;
      containerRef.current.appendChild(script);
    };

    const existing = document.querySelector(
      'script[src="https://ads-partners.coupang.com/g.js"]'
    );

    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://ads-partners.coupang.com/g.js";
      script.async = true;
      script.onload = initWidget;
      document.head.appendChild(script);
    } else if ((window as any).PartnersCoupang) {
      initWidget();
    } else {
      existing.addEventListener("load", initWidget);
    }
  }, []);

  return (
    <div className={className}>
      <div ref={containerRef} style={{ minHeight: "140px", width: "100%" }} />
      <p className="mt-1 text-center text-xs text-slate-400">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
}

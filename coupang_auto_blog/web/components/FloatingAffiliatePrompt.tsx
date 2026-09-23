"use client";

import { useEffect, useState } from "react";
import { AffiliateOutboundLink } from "@/components/AffiliateOutboundLink";

type FloatingAffiliatePromptProps = {
  linkId: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  productPrice?: number | null;
  contentId: string;
  position: string;
};

export function FloatingAffiliatePrompt({
  linkId,
  productId,
  productName,
  productImage,
  productPrice,
  contentId,
  position,
}: FloatingAffiliatePromptProps) {
  const [visible, setVisible] = useState(false);
  const storageKey = `semolink:floating-affiliate:${contentId}`;

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === "dismissed") return;
    } catch {}

    const timer = window.setTimeout(() => setVisible(true), 700);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(storageKey, "dismissed");
    } catch {}
  };

  return (
    <aside
      className="fixed left-4 right-4 top-[46%] z-[70] mx-auto w-auto max-w-sm -translate-y-1/2 overflow-hidden rounded-lg border-2 border-orange-500 bg-white shadow-2xl shadow-slate-950/30 sm:left-auto sm:right-6 sm:top-1/2 sm:mx-0 sm:w-[22rem]"
      aria-label="쿠팡 상품 바로가기"
    >
      <div className="bg-slate-950 px-4 py-3 pr-12 text-white">
        <p className="text-xs font-extrabold text-orange-300">쿠팡에서 바로 확인</p>
        <p className="mt-0.5 text-sm font-bold">현재 가격과 판매 조건을 확인하세요</p>
      </div>

      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center text-2xl leading-none text-white transition hover:text-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-300"
        aria-label="플로팅 상품 안내 닫기"
        title="닫기"
      >
        <span aria-hidden="true">×</span>
      </button>

      <div className="p-4">
        <div className="flex items-center gap-3">
          {productImage ? (
            <img
              src={productImage}
              alt=""
              className="h-20 w-20 shrink-0 rounded-md border border-slate-200 bg-slate-50 object-contain p-1"
            />
          ) : null}
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-extrabold leading-5 text-slate-950">
              {productName}
            </p>
            {productPrice != null ? (
              <p className="mt-1 text-lg font-black text-orange-600">
                {Math.round(productPrice).toLocaleString("ko-KR")}원
              </p>
            ) : (
              <p className="mt-1 text-xs font-semibold text-slate-500">현재 판매가 확인</p>
            )}
          </div>
        </div>

        <AffiliateOutboundLink
          linkId={linkId}
          tracking={{ productId, productName, contentId, position }}
          className="mt-4 flex min-h-12 w-full items-center justify-center bg-orange-500 px-4 text-base font-black text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
        >
          쿠팡에서 현재가 보기 <span className="ml-1" aria-hidden="true">↗</span>
        </AffiliateOutboundLink>
        <p className="mt-2 text-[10px] leading-4 text-slate-500">
          쿠팡 파트너스 활동으로 구매 시 일정액의 수수료를 제공받을 수 있습니다.
        </p>
      </div>
    </aside>
  );
}

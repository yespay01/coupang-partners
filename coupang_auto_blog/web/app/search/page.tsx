"use client";

import { useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CoupangDynamicBanner } from "@/components/CoupangDynamicBanner";
import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";
import { AffiliateOutboundLink } from "@/components/AffiliateOutboundLink";
import { sendAnalyticsEvent } from "@/lib/analytics";

interface Product {
  productId?: string;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  affiliateUrl?: string;
  affiliateLink?: { linkId: string; goUrl?: string };
  categoryName?: string;
}

const suggestedKeywords = ["무선 이어폰", "에어프라이어", "화장지", "고양이 모래"];

function validPrice(value: number) {
  return Number.isFinite(value) && value > 0;
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!keyword.trim() || isSearching) return;

    setIsSearching(true);
    setError(null);
    setSearched(true);
    try {
      const data = await apiClient.get<{
        success: boolean;
        data?: { products: Product[]; totalCount: number };
        error?: string;
      }>(`/api/search?keyword=${encodeURIComponent(keyword.trim())}&limit=10`);

      if (data.success && data.data) {
        setProducts([...data.data.products].sort((a, b) => {
          if (!validPrice(a.productPrice)) return 1;
          if (!validPrice(b.productPrice)) return -1;
          return a.productPrice - b.productPrice;
        }));
        if (data.data.products.length > 0) {
          sendAnalyticsEvent({ eventName: "list_view", surface: "search" });
        }
      } else {
        setError(data.error || "검색에 실패했습니다.");
        setProducts([]);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.";
      setError(errorMessage);
      setProducts([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-white selection:bg-amber-50">
      <SiteHeader />

      <div className="bg-white border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 pt-24">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">쿠팡 최저가 검색</h1>
          <p className="mt-2 text-slate-600">
            상품명을 입력하면 쿠팡 검색 결과를 낮은 가격부터 비교합니다.
          </p>

          {/* Search bar */}
          <div className="mt-6 flex gap-3">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="쿠팡 최저가 검색 · 상품명 입력"
              className="flex-1 rounded-xl border border-slate-300 px-5 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              disabled={isSearching}
            />
            <button
              onClick={handleSearch}
              disabled={!keyword.trim() || isSearching}
              className="rounded-xl bg-slate-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {isSearching ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  검색 중
                </span>
              ) : (
                "최저가 찾기"
              )}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="추천 검색어">
            {suggestedKeywords.map((item) => (
              <button key={item} type="button" onClick={() => setKeyword(item)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-700">
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 다이나믹 배너 - 검색창 하단 */}
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <CoupangDynamicBanner />
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {error && (
          <div className="mb-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {isSearching ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
                <div className="aspect-square bg-slate-200 rounded-lg mb-3" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-5 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <AffiliateDisclosure className="mb-4 text-center" />
            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              검색 결과 {products.length}개를 낮은 가격순으로 보여드립니다. 옵션·배송비를 포함한 최종 가격은 쿠팡에서 확인하세요.
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product, i) => (
                <AffiliateOutboundLink
                  key={i}
                  href={
                    product.affiliateLink?.linkId
                      ? undefined
                      : product.affiliateUrl || product.productUrl
                  }
                  linkId={product.affiliateLink?.linkId}
                  impressionEventName="product_card_impression"
                  tracking={{
                    productName: product.productName,
                    productId: product.productId,
                    surface: "search",
                    position: "search_card",
                  }}
                  className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {product.productImage && (
                    <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-slate-100">
                      <img
                        src={product.productImage}
                        alt={product.productName}
                        className="h-full w-full object-contain group-hover:scale-105 transition"
                      />
                    </div>
                  )}
                  <h3 className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:text-blue-600 transition">
                    {product.productName}
                  </h3>
                  {product.categoryName && (
                    <div className="mt-2 text-xs text-slate-500">{product.categoryName}</div>
                  )}
                  {validPrice(product.productPrice) && (
                    <div className="mt-3 text-lg font-extrabold tracking-tight text-slate-950">{Math.round(product.productPrice).toLocaleString("ko-KR")}원</div>
                  )}
                  <div className="mt-3 text-xs font-semibold text-orange-600">
                    쿠팡에서 최종가 확인 &rarr;
                  </div>
                </AffiliateOutboundLink>
              ))}
            </div>
          </>
        ) : searched && !error ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-700 mb-2">검색 결과가 없습니다</h3>
            <p className="text-sm text-slate-500">다른 키워드로 검색해보세요.</p>
          </div>
        ) : !searched ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-slate-500">상품명을 입력해 쿠팡 검색 결과 중 낮은 가격을 찾아보세요.</p>
          </div>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}

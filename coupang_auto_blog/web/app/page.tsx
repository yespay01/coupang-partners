import Link from "next/link";
import { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";
import { HomeProductCollection, type HomeProduct } from "@/components/HomeProductCollection";

export const metadata: Metadata = {
  title: "세모링크 - 쿠팡 상품을 조건으로 빠르게 찾기",
  description: "상품명, 카테고리와 가격대를 비교하고 검증된 링크로 쿠팡의 현재 가격을 확인하세요.",
  alternates: { canonical: "https://semolink.store" },
};

export const dynamic = "force-dynamic";

const AUTOMATION_SERVER_URL = process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

type PriceCoverage = {
  eligibleProductCount: number;
  trackedProductCount: number;
  untrackedProductCount: number;
  observedTodayCount: number;
  coveragePercent: number;
};

const EMPTY_COVERAGE: PriceCoverage = {
  eligibleProductCount: 0,
  trackedProductCount: 0,
  untrackedProductCount: 0,
  observedTodayCount: 0,
  coveragePercent: 0,
};

async function fetchPublishedProducts(): Promise<{ products: HomeProduct[]; totalCount: number; priceCoverage: PriceCoverage }> {
  if (process.env.NEXT_PHASE === "phase-production-build") return { products: [], totalCount: 0, priceCoverage: EMPTY_COVERAGE };
  try {
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/products?limit=100`, { cache: "no-store" });
    if (!response.ok) return { products: [], totalCount: 0, priceCoverage: EMPTY_COVERAGE };
    const result = await response.json();
    if (!result.success || !Array.isArray(result.data?.products)) return { products: [], totalCount: 0, priceCoverage: EMPTY_COVERAGE };
    const products = result.data.products.map((product: {
      productId: string;
      productName?: string;
      currentPriceKrw?: number | null;
      priceObservedAt?: string | null;
      productImage?: string | null;
      categoryName?: string | null;
      updatedAt?: string | null;
      affiliateLink?: { linkId: string; goUrl?: string };
    }) => ({
      id: product.productId,
      productId: product.productId,
      productName: product.productName,
      productPrice: product.currentPriceKrw || undefined,
      priceObservedAt: product.priceObservedAt || undefined,
      productImage: product.productImage || undefined,
      category: product.categoryName || undefined,
      createdAt: product.updatedAt || undefined,
      affiliateLink: product.affiliateLink,
    }));
    return {
      products,
      totalCount: Number(result.data.totalCount || products.length),
      priceCoverage: { ...EMPTY_COVERAGE, ...(result.data.priceCoverage || {}) },
    };
  } catch {
    return { products: [], totalCount: 0, priceCoverage: EMPTY_COVERAGE };
  }
}

export default async function HomePage() {
  const { products, totalCount, priceCoverage } = await fetchPublishedProducts();
  const linkedProductCount = products.filter((product) => product.affiliateLink?.linkId).length;

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <SiteHeader />
      <main className="pb-4 pt-24">
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0 opacity-50" aria-hidden="true">
            <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-orange-500/30 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
          </div>
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:py-24">
            <div>
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-orange-200 backdrop-blur">실제 관측 가격으로 선택</p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-6xl">필요한 조건만 보고,<br />쿠팡에서 바로 확인하세요.</h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">상품명·카테고리·가격대를 한곳에서 비교하고, 확인된 쿠팡 링크로 현재 판매 정보를 살펴볼 수 있습니다.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#products" className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-400">상품 모음 바로 보기</a>
                <Link href="/search" className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15">쿠팡 최저가 검색</Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="text-2xl font-black">{totalCount.toLocaleString("ko-KR")}</p><p className="mt-1 text-xs text-slate-300">현재 검증 상품</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="text-2xl font-black">{priceCoverage.trackedProductCount.toLocaleString("ko-KR")} / {priceCoverage.eligibleProductCount.toLocaleString("ko-KR")}</p><p className="mt-1 text-xs text-slate-300">실제 가격 추적 상품</p></div>
              <div className="col-span-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4"><p className="text-sm font-bold text-emerald-100">확인되지 않은 쿠팡 링크는 열지 않습니다.</p><p className="mt-1 text-xs leading-5 text-slate-300">쿠팡 이동 버튼은 제휴 ID 검증을 통과한 중앙 링크가 있을 때만 표시됩니다.</p></div>
            </div>
          </div>
        </section>

        {linkedProductCount > 0 && <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6"><AffiliateDisclosure /></div>}

        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-3 px-4 py-8 sm:grid-cols-3 sm:px-6">
          {[
            ["조건 중심", "긴 사용후기 대신 상품명·카테고리·가격대를 먼저 봅니다."],
            ["가격 흐름", "실제 관측값만 쌓고, 2회 이상 관측되면 90일 차트를 보여드립니다."],
            ["검증 링크", "형식과 제휴 ID 검증을 통과한 링크만 쿠팡 버튼에 연결합니다."],
          ].map(([title, description]) => <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm font-extrabold text-slate-900">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>)}
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Daily discovery</p><h2 className="mt-1 text-lg font-extrabold text-slate-950">매일 신규 상품을 발견해 가격 관측에 편입합니다</h2></div>
              <p className="text-xs text-slate-500">베스트 · 골드박스 · 실제 검색 수요를 반영하고 확인된 상품만 추가합니다.</p>
            </div>
          </div>
        </section>

        {products.length > 0 ? <HomeProductCollection products={products} totalCount={totalCount} /> : <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6"><div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center"><p className="font-bold text-slate-800">공개 상품을 불러오지 못했습니다.</p><p className="mt-1 text-sm text-slate-500">잠시 후 다시 확인해 주세요.</p></div></section>}
      </main>
      <SiteFooter />
    </div>
  );
}

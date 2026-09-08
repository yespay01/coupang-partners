"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AffiliateOutboundLink } from "@/components/AffiliateOutboundLink";
import { ImpressionBoundary } from "@/components/ImpressionBoundary";

export type HomeProduct = {
  id: string;
  productId?: string;
  productName?: string;
  productPrice?: number;
  priceObservedAt?: string;
  productImage?: string;
  category?: string;
  createdAt?: string;
  publishedAt?: string;
  slug?: string;
  affiliateLink?: { linkId: string; goUrl?: string };
};

type PriceFilter = "all" | "under-20000" | "20000-50000" | "50000-100000" | "over-100000";
type SortKey = "latest" | "price-low" | "price-high";

const priceFilters: { key: PriceFilter; label: string }[] = [
  { key: "all", label: "전체 가격" },
  { key: "under-20000", label: "2만원 이하" },
  { key: "20000-50000", label: "2~5만원" },
  { key: "50000-100000", label: "5~10만원" },
  { key: "over-100000", label: "10만원 이상" },
];

function validPrice(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function matchesPrice(price: number | undefined, filter: PriceFilter) {
  if (filter === "all") return true;
  if (!validPrice(price)) return false;
  if (filter === "under-20000") return price! < 20_000;
  if (filter === "20000-50000") return price! >= 20_000 && price! < 50_000;
  if (filter === "50000-100000") return price! >= 50_000 && price! < 100_000;
  return price! >= 100_000;
}

function formatPrice(price?: number) {
  if (!validPrice(price)) return null;
  return `${Math.round(price!).toLocaleString("ko-KR")}원`;
}

export function ProductCard({
  product,
  index,
  surface = "home",
}: {
  product: HomeProduct;
  index: number;
  surface?: "home" | "collection";
}) {
  const image = product.productImage;
  const price = formatPrice(product.productPrice);
  const position = `${surface}_collection_${index + 1}`;
  const detailHref = product.productId
    ? `/products/${encodeURIComponent(product.productId)}`
    : null;

  return (
    <ImpressionBoundary
      className="h-full"
      event={{
        eventName: "product_card_impression",
        surface,
        contentId: product.slug ?? product.id,
        productId: product.productId,
        position,
        linkId: product.affiliateLink?.linkId,
      }}
    >
      <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-950/5">
        <div className="relative block overflow-hidden bg-slate-100">
          <div className="aspect-square">
            {image && detailHref ? (
              <Link href={detailHref} aria-label={`${product.productName || "상품"} 가격 흐름 보기`} className="block h-full w-full">
                <img src={image} alt={product.productName || "상품 이미지"} className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-105" />
              </Link>
            ) : image ? (
              <img src={image} alt={product.productName || "상품 이미지"} className="h-full w-full object-contain p-3" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400">이미지 준비 중</div>
            )}
          </div>
          {product.category && (
            <span className="absolute left-3 top-3 max-w-[75%] truncate rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">{product.category}</span>
          )}
          {product.affiliateLink?.linkId && (
            <span className="absolute bottom-3 left-3 rounded-full bg-emerald-950/90 px-2.5 py-1 text-[10px] font-semibold text-white">쿠팡 링크 확인됨</span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="min-h-[2.75rem] line-clamp-2 text-sm font-semibold leading-snug text-slate-900 sm:text-[15px]">
            {detailHref ? <Link href={detailHref} className="hover:text-orange-600">{product.productName || "상품 정보"}</Link> : product.productName || "상품 정보"}
          </h3>
          <div className="mt-3 min-h-[3rem]">
            {price ? (
              <><p className="text-lg font-extrabold tracking-tight text-slate-950">{price}</p><p className="text-[10px] text-slate-400">실제 관측 가격 · 기준 시간은 상세에서 확인</p></>
            ) : (
              <p className="text-xs font-medium text-slate-500">쿠팡에서 현재 가격을 확인하세요</p>
            )}
          </div>
          <div className="mt-4 grid gap-2">
            {detailHref && (
              <Link href={detailHref} className="flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700">
                가격 흐름 보기
              </Link>
            )}
            {product.affiliateLink?.linkId ? (
              <AffiliateOutboundLink
                linkId={product.affiliateLink.linkId}
                tracking={{ reviewId: product.id, reviewSlug: product.slug, productName: product.productName, productId: product.productId, contentId: product.slug ?? product.id, surface, position }}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2.5 text-center text-sm font-bold text-white transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
              >
                쿠팡에서 현재가 확인 <span aria-hidden="true">↗</span>
              </AffiliateOutboundLink>
            ) : (
              <div className="flex min-h-11 items-center justify-center rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-500">쿠팡 링크 확인 중</div>
            )}
          </div>
        </div>
      </article>
    </ImpressionBoundary>
  );
}

type CatalogProductDto = {
  productId: string;
  productName?: string;
  currentPriceKrw?: number | null;
  priceObservedAt?: string | null;
  productImage?: string | null;
  categoryName?: string | null;
  updatedAt?: string | null;
  affiliateLink?: { linkId: string; goUrl?: string };
};

function mapCatalogProduct(product: CatalogProductDto): HomeProduct {
  return {
    id: product.productId,
    productId: product.productId,
    productName: product.productName,
    productPrice: product.currentPriceKrw || undefined,
    priceObservedAt: product.priceObservedAt || undefined,
    productImage: product.productImage || undefined,
    category: product.categoryName || undefined,
    createdAt: product.updatedAt || undefined,
    affiliateLink: product.affiliateLink,
  };
}

export function HomeProductCollection({ products, totalCount }: { products: HomeProduct[]; totalCount: number }) {
  const [catalogProducts, setCatalogProducts] = useState(products);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState("전체");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sort, setSort] = useState<SortKey>("latest");
  const [query, setQuery] = useState("");

  const categories = useMemo(() => {
    const values = Array.from(new Set(catalogProducts.map((product) => product.category?.trim()).filter(Boolean) as string[]));
    return ["전체", ...values.slice(0, 12)];
  }, [catalogProducts]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    const result = catalogProducts.filter((product) => {
      if (category !== "전체" && product.category !== category) return false;
      if (!matchesPrice(product.productPrice, priceFilter)) return false;
      if (normalizedQuery && !`${product.productName || ""} ${product.category || ""}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery)) return false;
      return true;
    });
    return [...result].sort((a, b) => {
      if (sort === "price-low") return (validPrice(a.productPrice) ? a.productPrice! : Number.MAX_SAFE_INTEGER) - (validPrice(b.productPrice) ? b.productPrice! : Number.MAX_SAFE_INTEGER);
      if (sort === "price-high") return (validPrice(b.productPrice) ? b.productPrice! : -1) - (validPrice(a.productPrice) ? a.productPrice! : -1);
      return String(b.publishedAt || b.createdAt || "").localeCompare(String(a.publishedAt || a.createdAt || ""));
    });
  }, [catalogProducts, category, priceFilter, query, sort]);

  const resetFilters = () => { setCategory("전체"); setPriceFilter("all"); setSort("latest"); setQuery(""); };
  const hasMore = catalogProducts.length < totalCount;

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/catalog/products?limit=50&offset=${catalogProducts.length}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success || !Array.isArray(payload.data?.products)) throw new Error();
      const incoming = payload.data.products.map(mapCatalogProduct);
      setCatalogProducts((current) => {
        const known = new Set(current.map((item) => item.productId));
        return [...current, ...incoming.filter((item: HomeProduct) => !known.has(item.productId))];
      });
    } catch {
      setLoadError("추가 상품을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <section id="products" className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-20 sm:px-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Product collection</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">조건으로 빠르게 고르기</h2><p className="mt-1 text-sm text-slate-500">상품명·카테고리·실제 관측 가격을 먼저 비교합니다.</p></div>
        <p className="text-sm font-semibold text-slate-600" aria-live="polite">{filteredProducts.length.toLocaleString("ko-KR")}개 표시 · 전체 {totalCount.toLocaleString("ko-KR")}개</p>
      </div>

      <div className="sticky top-24 z-30 mb-6 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-950/5 backdrop-blur sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto]">
          <label className="relative block"><span className="sr-only">상품명 검색</span><svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="11" cy="11" r="7" strokeWidth="2" /><path d="m20 20-3.5-3.5" strokeWidth="2" strokeLinecap="round" /></svg><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명으로 최저가 후보 찾기" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100" /></label>
          <label><span className="sr-only">정렬</span><select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-orange-400 lg:w-36"><option value="latest">최신 등록순</option><option value="price-low">낮은 가격순</option><option value="price-high">높은 가격순</option></select></label>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="카테고리 필터">
          {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${category === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item}</button>)}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="가격대 필터">
          {priceFilters.map((item) => <button key={item.key} type="button" onClick={() => setPriceFilter(item.key)} aria-pressed={priceFilter === item.key} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition ${priceFilter === item.key ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>{item.label}</button>)}
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{filteredProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
          {hasMore && <div className="mt-8 text-center"><button type="button" onClick={loadMore} disabled={isLoadingMore} className="min-h-12 rounded-xl border border-slate-300 bg-white px-8 text-sm font-extrabold text-slate-800 transition hover:border-orange-400 hover:text-orange-700 disabled:opacity-50">{isLoadingMore ? "상품 불러오는 중…" : `상품 더 보기 (${catalogProducts.length.toLocaleString("ko-KR")} / ${totalCount.toLocaleString("ko-KR")})`}</button></div>}
          {loadError && <p className="mt-3 text-center text-sm text-rose-600" role="alert">{loadError}</p>}
        </>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center"><p className="text-base font-bold text-slate-800">조건에 맞는 상품이 없습니다.</p><p className="mt-1 text-sm text-slate-500">검색어나 가격대를 바꿔 보세요.</p><button type="button" onClick={resetFilters} className="mt-5 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white">필터 초기화</button></div>
      )}
    </section>
  );
}

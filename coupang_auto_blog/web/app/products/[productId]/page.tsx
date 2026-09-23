import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";
import { AffiliateOutboundLink } from "@/components/AffiliateOutboundLink";
import { FloatingAffiliatePrompt } from "@/components/FloatingAffiliatePrompt";
import { PriceHistoryChart, type PriceHistoryPoint } from "@/components/PriceHistoryChart";
import { ProductCard, type HomeProduct } from "@/components/HomeProductCollection";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { buildProductPlainText, buildProductSearchMetadata } from "@/lib/productSeo";

export const dynamic = "force-dynamic";

const AUTOMATION_SERVER_URL = process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

type ProductSummary = {
  productId: string;
  productName: string;
  currentPriceKrw: number | null;
  priceObservedAt: string | null;
  productImage: string | null;
  categoryId: string | null;
  categoryName: string | null;
  updatedAt: string | null;
  affiliateLink?: { linkId: string; goUrl?: string };
};

type PriceHistory = {
  productId: string;
  chartStatus: "available" | "insufficient_data";
  minimumPointCount: number;
  pointCount: number;
  isSynthetic: false;
  points: PriceHistoryPoint[];
};

type PageProps = { params: Promise<{ productId: string }> };

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${AUTOMATION_SERVER_URL}${path}`, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.success ? payload.data as T : null;
  } catch {
    return null;
  }
}

async function getProduct(productId: string) {
  return fetchJson<ProductSummary>(`/api/products/${encodeURIComponent(productId)}/summary`);
}

async function getPriceHistory(productId: string) {
  return fetchJson<PriceHistory>(`/api/products/${encodeURIComponent(productId)}/price-history?days=90`);
}

async function getRelatedProducts(categoryId: string | null, currentProductId: string): Promise<HomeProduct[]> {
  if (!categoryId) return [];
  const data = await fetchJson<{ products?: ProductSummary[] }>(
    `/api/products?limit=9&categoryId=${encodeURIComponent(categoryId)}`
  );
  return (Array.isArray(data?.products) ? data.products : [])
    .filter((item) => item.productId !== currentProductId)
    .slice(0, 8)
    .map((item) => ({
      id: item.productId,
      productId: item.productId,
      productName: item.productName,
      productPrice: item.currentPriceKrw ?? undefined,
      priceObservedAt: item.priceObservedAt ?? undefined,
      productImage: item.productImage ?? undefined,
      category: item.categoryName ?? undefined,
      createdAt: item.updatedAt ?? undefined,
      affiliateLink: item.affiliateLink,
    }));
}

function formatPrice(value: number | null) {
  return value == null ? null : `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatObservedAt(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProduct(productId);
  if (!product) return { title: "상품을 찾을 수 없습니다", robots: { index: false, follow: false } };
  const searchMeta = buildProductSearchMetadata(product.productName, product.currentPriceKrw);
  return {
    title: searchMeta.title,
    description: searchMeta.description,
    alternates: { canonical: `https://semolink.store/products/${encodeURIComponent(product.productId)}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${searchMeta.title} | 세모링크`,
      description: searchMeta.description,
      type: "website",
      ...(product.productImage ? { images: [{ url: product.productImage, alt: searchMeta.normalizedName }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { productId } = await params;
  const [product, history] = await Promise.all([getProduct(productId), getPriceHistory(productId)]);
  if (!product) notFound();
  const relatedProducts = await getRelatedProducts(product.categoryId, product.productId);

  const currentPrice = formatPrice(product.currentPriceKrw);
  const observedAt = formatObservedAt(product.priceObservedAt);
  const observedDate = formatShortDate(product.priceObservedAt);
  const chartAvailable = history?.chartStatus === "available" && history.points.length >= 2;
  const canonicalUrl = `https://semolink.store/products/${encodeURIComponent(product.productId)}`;
  const plainText = buildProductPlainText(product.productName, product.categoryName, product.currentPriceKrw);
  const lowPrice = history?.points.length
    ? Math.min(...history.points.map((point) => point.priceKrw))
    : null;
  const highPrice = history?.points.length
    ? Math.max(...history.points.map((point) => point.priceKrw))
    : null;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.productName,
    sku: product.productId,
    ...(product.productImage ? { image: [product.productImage] } : {}),
    ...(product.categoryName ? { category: product.categoryName } : {}),
    ...(product.currentPriceKrw != null
      ? {
          offers: {
            "@type": "Offer",
            url: canonicalUrl,
            priceCurrency: "KRW",
            price: Math.round(product.currentPriceKrw),
          },
        }
      : {}),
    additionalProperty: [
      { "@type": "PropertyValue", name: "가격 관측 방식", value: "쿠팡 API 실제 응답 가격" },
      ...(observedDate ? [{ "@type": "PropertyValue", name: "최근 관측일", value: observedDate }] : []),
      ...(history?.pointCount != null ? [{ "@type": "PropertyValue", name: "90일 관측 횟수", value: String(history.pointCount) }] : []),
    ],
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "상품 모음", item: "https://semolink.store" },
      ...(product.categoryId && product.categoryName
        ? [{ "@type": "ListItem", position: 2, name: product.categoryName, item: `https://semolink.store/collections/${encodeURIComponent(product.categoryId)}` }]
        : []),
      { "@type": "ListItem", position: product.categoryId && product.categoryName ? 3 : 2, name: product.productName, item: canonicalUrl },
    ],
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `${product.productName} 가격은 어떻게 확인하나요?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "세모링크는 쿠팡 API에서 실제로 관측한 가격과 관측 시각을 표시합니다. 최종 현재가는 쿠팡 이동 후 판매 페이지에서 다시 확인해야 합니다.",
        },
      },
      {
        "@type": "Question",
        name: "가격 그래프가 없으면 상품 정보가 없는 건가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "아닙니다. 가격 관측값이 2개 이상 쌓이면 90일 가격 흐름 그래프가 표시됩니다.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader />
      <main className="pb-24 pt-28">
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <nav className="mb-5 flex items-center gap-2 text-xs font-semibold text-slate-500" aria-label="현재 위치">
            <Link href="/" className="hover:text-orange-600">상품 모음</Link>
            <span aria-hidden="true">/</span>
            {product.categoryId && product.categoryName ? (
              <Link href={`/collections/${encodeURIComponent(product.categoryId)}`} className="truncate text-slate-700 hover:text-orange-600">
                {product.categoryName}
              </Link>
            ) : (
              <span className="truncate text-slate-700">상품 정보</span>
            )}
          </nav>

          <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
            <div className="aspect-square overflow-hidden rounded-2xl bg-slate-50">
              {product.productImage ? (
                <img src={product.productImage} alt={product.productName} className="h-full w-full object-contain p-5" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">이미지 준비 중</div>
              )}
            </div>
            <div>
              {product.categoryName && <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">{product.categoryName}</p>}
              <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">{product.productName}</h1>
              <div className="mt-7 rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-bold text-slate-500">최근 실제 관측 가격</p>
                {currentPrice && observedAt ? (
                  <>
                    <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{currentPrice}</p>
                    <p className="mt-2 text-xs text-slate-500">{observedAt} KST · 쿠팡에서 변동 가능</p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-lg font-extrabold text-slate-800">가격 관측 준비 중</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">기존 저장값을 오늘 가격으로 가정하지 않습니다. 정확한 현재가는 쿠팡에서 확인해 주세요.</p>
                  </>
                )}
              </div>
              {product.affiliateLink?.linkId && (
                <div className="mt-5">
                  <AffiliateOutboundLink
                    linkId={product.affiliateLink.linkId}
                    tracking={{ productId: product.productId, productName: product.productName, contentId: product.productId, surface: "detail", position: "product_detail_primary" }}
                    className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-orange-500 px-5 text-base font-extrabold text-white transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                  >
                    쿠팡에서 현재가 확인 <span aria-hidden="true" className="ml-1">↗</span>
                  </AffiliateOutboundLink>
                  <AffiliateDisclosure className="mt-3" />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-labelledby="product-search-summary-title">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Product facts</p>
              <h2 id="product-search-summary-title" className="mt-2 text-lg font-black text-slate-950">{product.productName} 가격 확인 정보</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{plainText.intro}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Observation basis</p>
              <h2 className="mt-2 text-lg font-black text-slate-950">관측 기준</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{plainText.basis}</p>
              {lowPrice != null && highPrice != null && (
                <p className="mt-3 text-sm font-bold text-slate-800">90일 관측 범위: {formatPrice(lowPrice)} ~ {formatPrice(highPrice)}</p>
              )}
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Compare</p>
              <h2 className="mt-2 text-lg font-black text-slate-950">비교 포인트</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{plainText.compare}</p>
              {product.categoryId && product.categoryName && (
                <Link href={`/collections/${encodeURIComponent(product.categoryId)}`} className="mt-4 inline-flex text-sm font-bold text-orange-600 hover:text-orange-700">
                  {product.categoryName} 상품 더 보기 →
                </Link>
              )}
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Observed price</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">최근 90일 가격 흐름</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">쿠팡 Product API에서 실제로 관측한 값만 표시하며, 추정·보간·임의 소급은 하지 않습니다.</p>
          </div>
          {chartAvailable ? (
            <PriceHistoryChart points={history.points} />
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-xl" aria-hidden="true">↗</div>
              <p className="mt-4 text-base font-extrabold text-slate-900">정확한 차트를 만들기 위해 가격을 관측 중입니다</p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">실제 관측값이 2개 이상 쌓이면 차트가 표시됩니다. 현재 {history?.pointCount || 0}개의 관측값이 있습니다.</p>
            </div>
          )}
        </section>

        {relatedProducts.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-labelledby="related-products-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Related products</p>
                <h2 id="related-products-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {product.categoryName || "같은 카테고리"} 상품 더 보기
                </h2>
              </div>
              {product.categoryId && (
                <Link href={`/collections/${encodeURIComponent(product.categoryId)}`} className="shrink-0 text-sm font-bold text-orange-600 hover:text-orange-700">
                  전체 보기 →
                </Link>
              )}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {relatedProducts.map((item, index) => (
                <ProductCard key={item.id} product={item} index={index} surface="related" />
              ))}
            </div>
          </section>
        )}
      </main>
      {product.affiliateLink?.linkId && (
        <FloatingAffiliatePrompt
          linkId={product.affiliateLink.linkId}
          productId={product.productId}
          productName={product.productName}
          productImage={product.productImage}
          productPrice={product.currentPriceKrw}
          contentId={product.productId}
          position="product_floating_prompt"
        />
      )}
      <SiteFooter />
    </div>
  );
}

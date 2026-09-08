import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";
import { AffiliateOutboundLink } from "@/components/AffiliateOutboundLink";
import { PriceHistoryChart, type PriceHistoryPoint } from "@/components/PriceHistoryChart";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProduct(productId);
  if (!product) return { title: "상품을 찾을 수 없습니다", robots: { index: false, follow: false } };
  const normalizedName = product.productName.replace(/\s+/g, " ").trim();
  const titleName = normalizedName.length > 38 ? `${normalizedName.slice(0, 38)}…` : normalizedName;
  const observedPrice = product.currentPriceKrw == null
    ? ""
    : ` 최근 관측가 ${Math.round(product.currentPriceKrw).toLocaleString("ko-KR")}원.`;
  return {
    title: `${titleName} 가격 변동`,
    description: `${normalizedName}의${observedPrice} 최근 90일 실제 관측 가격 흐름과 쿠팡 현재 판매 정보를 확인하세요.`.slice(0, 160),
    alternates: { canonical: `https://semolink.store/products/${encodeURIComponent(product.productId)}` },
    openGraph: {
      title: `${titleName} 가격 변동 | 세모링크`,
      description: `${normalizedName}의 실제 관측 가격 흐름을 확인하세요.`,
      type: "website",
      ...(product.productImage ? { images: [{ url: product.productImage, alt: normalizedName }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { productId } = await params;
  const [product, history] = await Promise.all([getProduct(productId), getPriceHistory(productId)]);
  if (!product) notFound();

  const currentPrice = formatPrice(product.currentPriceKrw);
  const observedAt = formatObservedAt(product.priceObservedAt);
  const chartAvailable = history?.chartStatus === "available" && history.points.length >= 2;
  const canonicalUrl = `https://semolink.store/products/${encodeURIComponent(product.productId)}`;
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
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }}
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
      </main>
      <SiteFooter />
    </div>
  );
}

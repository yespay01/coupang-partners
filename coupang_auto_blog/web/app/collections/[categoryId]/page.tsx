import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";
import { ProductCard, type HomeProduct } from "@/components/HomeProductCollection";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

const AUTOMATION_SERVER_URL = process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";
const CATEGORY_ID_PATTERN = /^[A-Za-z0-9:_-]{1,100}$/;

type CollectionData = {
  categoryId: string;
  categoryName: string;
  products: HomeProduct[];
  totalCount: number;
};

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

type PageProps = { params: Promise<{ categoryId: string }> };

async function getCollection(categoryId: string): Promise<CollectionData | null> {
  if (!CATEGORY_ID_PATTERN.test(categoryId)) return null;
  try {
    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/products?limit=100&categoryId=${encodeURIComponent(categoryId)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return null;
    const payload = await response.json();
    const rows = Array.isArray(payload.data?.products) ? payload.data.products : [];
    const products: HomeProduct[] = rows.map((product: CatalogProductDto) => ({
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
    const categoryName = rows.find((product: CatalogProductDto) => product.categoryName)?.categoryName;
    if (!categoryName || products.length === 0) return null;
    return { categoryId, categoryName, products, totalCount: Number(payload.data?.totalCount || products.length) };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categoryId } = await params;
  const collection = await getCollection(categoryId);
  if (!collection) return { title: "카테고리를 찾을 수 없습니다", robots: { index: false, follow: false } };
  return {
    title: `${collection.categoryName} 쿠팡 상품 가격 비교`,
    description: `${collection.categoryName} 상품 ${collection.totalCount.toLocaleString("ko-KR")}개의 최근 실제 관측 가격과 쿠팡 판매 정보를 비교하세요.`.slice(0, 160),
    alternates: { canonical: `https://semolink.store/collections/${encodeURIComponent(categoryId)}` },
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const { categoryId } = await params;
  const collection = await getCollection(categoryId);
  if (!collection) notFound();
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${collection.categoryName} 상품 가격 비교`,
    numberOfItems: collection.products.length,
    itemListElement: collection.products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.productName,
      url: `https://semolink.store/products/${encodeURIComponent(product.productId || product.id)}`,
    })),
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-32 sm:px-6">
        <nav className="text-xs font-semibold text-slate-500" aria-label="현재 위치">
          <Link href="/collections" className="hover:text-orange-600">카테고리</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-slate-700">{collection.categoryName}</span>
        </nav>
        <header className="mt-6 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Verified collection</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">{collection.categoryName} 상품 가격 비교</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">실제 가격 관측값과 검증된 쿠팡 이동 링크가 있는 상품 {collection.totalCount.toLocaleString("ko-KR")}개를 모았습니다.</p>
          <AffiliateDisclosure className="mt-5" />
        </header>
        <section className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {collection.products.map((product, index) => <ProductCard key={product.id} product={product} index={index} surface="collection" />)}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

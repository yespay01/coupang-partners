import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "쿠팡 상품 카테고리별 가격 비교",
  description: "카테고리별로 쿠팡 상품을 살펴보고 최근 실제 관측 가격과 가격 흐름을 비교하세요.",
  alternates: { canonical: "https://semolink.store/collections" },
};

const AUTOMATION_SERVER_URL = process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

type ProductCategory = {
  categoryId: string;
  categoryName: string;
  productCount: number;
};

async function getCategories(): Promise<ProductCategory[]> {
  try {
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/products/categories`, { cache: "no-store" });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload.data?.categories) ? payload.data.categories : [];
  } catch {
    return [];
  }
}

export default async function CollectionsPage() {
  const categories = await getCategories();
  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-32 sm:px-6">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Category collections</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">카테고리별 상품 가격 비교</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">실제 가격이 관측되고 검증된 쿠팡 링크가 있는 상품을 카테고리별로 모았습니다.</p>
        </header>

        {categories.length > 0 ? (
          <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.categoryId}
                href={`/collections/${encodeURIComponent(category.categoryId)}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg"
              >
                <h2 className="text-lg font-extrabold text-slate-900 group-hover:text-orange-700">{category.categoryName}</h2>
                <p className="mt-2 text-sm text-slate-500">가격 확인 가능 상품 {category.productCount.toLocaleString("ko-KR")}개</p>
                <p className="mt-5 text-xs font-bold text-orange-600">상품 모음 보기 →</p>
              </Link>
            ))}
          </section>
        ) : (
          <p className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">카테고리 정보를 불러오지 못했습니다.</p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

import Link from "next/link";
import { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CoupangDynamicBanner } from "@/components/CoupangDynamicBanner";

export const metadata: Metadata = {
  title: "세모링크 - 쿠팡 최저가 비교·추천템 모음",
  description:
    "직접 써보고 골라낸 쿠팡 추천템과 최저가 비교. 솔직 후기, 카테고리별 베스트, 레시피 재료까지 한 번에 확인하세요.",
  alternates: {
    canonical: "https://semolink.store",
  },
};

export const dynamic = "force-dynamic";

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

interface PublishedReview {
  id: string;
  productName?: string;
  content?: string;
  category?: string;
  createdAt?: string;
  slug?: string;
  media?: { type: string; url: string }[];
}

async function fetchPublishedReviews(): Promise<PublishedReview[]> {
  if (process.env.NEXT_PHASE === "phase-production-build") return [];
  try {
    const res = await fetch(
      `${AUTOMATION_SERVER_URL}/api/reviews?limit=100`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (data.success && data.data?.reviews) return data.data.reviews;
    return [];
  } catch {
    return [];
  }
}

function ProductCard({ review }: { review: PublishedReview }) {
  const previewImage = review.media?.find((m) => m.type === "image")?.url;
  const href = review.slug ? `/reviews/${review.slug}` : `/review/${review.id}`;

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {previewImage ? (
          <img
            src={previewImage}
            alt={review.productName || ""}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-xs">
            이미지 준비중
          </div>
        )}
        {review.category && (
          <span className="absolute top-2 left-2 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
            {review.category}
          </span>
        )}
      </div>
      <div className="flex flex-col flex-grow p-3 sm:p-4">
        <h3 className="text-sm sm:text-[15px] font-medium text-slate-900 leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors min-h-[2.5rem]">
          {review.productName}
        </h3>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-orange-600 group-hover:text-orange-700">
            쿠팡 최저가 보기
          </span>
          <svg
            className="w-4 h-4 text-orange-500 transition-transform group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const reviews = await fetchPublishedReviews();

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />

      <main className="pt-28 pb-16">
        {/* 쿠팡 다이나믹 배너 */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <CoupangDynamicBanner />
        </section>

        {/* 페이지 타이틀 */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            오늘의 쿠팡 추천템
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            직접 써보고 골라낸 베스트 아이템, 최저가로 확인하세요.
          </p>
        </section>

        {/* 상품 그리드 */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          {reviews.length > 0 ? (
            <div className="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {reviews.map((review) => (
                <ProductCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 rounded-2xl bg-white ring-1 ring-slate-100">
              <p className="text-slate-400 text-sm">
                곧 새로운 추천템이 올라옵니다.
              </p>
            </div>
          )}

          <p className="mt-10 text-center text-xs text-slate-400">
            이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의
            수수료를 제공받습니다.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { type ReviewDoc } from "@/lib/firestore";

type PublishedReview = ReviewDoc & {
  id: string;
};

async function fetchPublishedReviews(maxCount: number): Promise<PublishedReview[]> {
  try {
    const data = await apiClient.get<{
      success: boolean;
      data: { reviews: PublishedReview[]; totalCount: number; hasMore: boolean } | PublishedReview[];
    }>(`/api/reviews?limit=${maxCount}&statuses=published`);
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray((data.data as any)?.reviews)) return (data.data as any).reviews;
    return [];
  } catch (error) {
    console.error("리뷰 로딩 실패:", error);
    return [];
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function stripHtmlTags(html: string): string {
  if (!html) return "";
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function truncateContent(content: string, maxLength: number = 120): string {
  if (!content) return "";
  const plainText = stripHtmlTags(content);
  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength) + "...";
}

function ReviewCard({ review }: { review: PublishedReview }) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-2">
            {review.productName || `상품 리뷰 #${review.id.slice(0, 6)}`}
          </h3>
          <p className="mt-2 text-sm text-slate-600 line-clamp-3">
            {truncateContent(review.content || "", 150)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {review.author || "AI 리뷰어"}
          </span>
          <span>{formatDate(review.createdAt || "")}</span>
        </div>
        <Link
          href={`/review/${review.id}`}
          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 transition"
        >
          자세히 보기
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

function ReviewCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-6 bg-slate-200 rounded w-3/4 mb-3" />
      <div className="space-y-2">
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-4 bg-slate-100 rounded w-5/6" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="h-3 bg-slate-100 rounded w-24" />
        <div className="h-3 bg-slate-100 rounded w-16" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">아직 게시된 리뷰가 없습니다</h3>
      <p className="text-sm text-slate-500 mb-6">
        관리자가 리뷰를 승인하면 여기에 표시됩니다.
      </p>
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
      >
        관리자 대시보드로 이동
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  );
}

const categories = [
  { name: "전체", slug: "all" },
  { name: "라이프스타일", slug: "lifestyle" },
  { name: "디지털/가전", slug: "digital" },
  { name: "주방/쿠킹", slug: "kitchen" },
  { name: "패션/뷰티", slug: "fashion" },
];

export default function HomePage() {
  const [latestReviews, setLatestReviews] = useState<PublishedReview[]>([]);
  const [popularReviews, setPopularReviews] = useState<PublishedReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    async function loadReviews() {
      try {
        setIsLoading(true);
        setError(null);
        const reviews = await fetchPublishedReviews(12);
        setLatestReviews(reviews.slice(0, 6));
        setPopularReviews(reviews.slice(0, 6).reverse());
      } catch (err) {
        console.error("리뷰 로딩 실패:", err);
        setError("리뷰를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    loadReviews();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="font-bold text-slate-900">쿠팡 리뷰</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              {categories.slice(1).map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCategory(cat.slug)}
                  className={`hover:text-slate-900 transition ${
                    activeCategory === cat.slug ? "text-blue-600" : ""
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </nav>
            <Link
              href="/admin"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              관리자
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              AI가 작성한 신뢰할 수 있는 리뷰
            </span>
            <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-5xl">
              쿠팡 상품 리뷰를
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                한눈에 확인하세요
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
              AI가 분석하고 정리한 쿠팡 파트너스 상품 리뷰를 만나보세요.
              <br className="hidden sm:block" />
              실제 구매에 도움이 되는 정보만 엄선했습니다.
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter (Mobile) */}
      <div className="md:hidden border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  activeCategory === cat.slug
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {error && (
          <div className="mb-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Latest Reviews Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">최신 리뷰</h2>
              <p className="mt-1 text-sm text-slate-500">방금 게시된 따끈따끈한 리뷰</p>
            </div>
            <Link
              href="/reviews?sort=latest"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
            >
              전체보기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <ReviewCardSkeleton key={i} />
              ))}
            </div>
          ) : latestReviews.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>

        {/* Popular Reviews Section */}
        {!isLoading && popularReviews.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">인기 리뷰</h2>
                <p className="mt-1 text-sm text-slate-500">많은 분들이 찾아본 리뷰</p>
              </div>
              <Link
                href="/reviews?sort=popular"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
              >
                전체보기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {popularReviews.map((review) => (
                <ReviewCard key={`popular-${review.id}`} review={review} />
              ))}
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            더 많은 리뷰가 궁금하신가요?
          </h2>
          <p className="text-slate-600 mb-6 max-w-lg mx-auto">
            매일 새로운 상품 리뷰가 AI에 의해 자동으로 생성되고 있습니다.
            관리자 승인을 거쳐 신뢰할 수 있는 리뷰만 게시됩니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/reviews"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              모든 리뷰 보기
            </Link>
            <Link
              href="/admin"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              관리자 대시보드
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
              </div>
              <span>쿠팡 파트너스 자동화 블로그</span>
            </div>
            <p>&copy; {new Date().getFullYear()} Coupang Partners Auto Blog. AI 기반 리뷰 시스템.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

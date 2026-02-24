"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { type ReviewDoc } from "@/lib/firestore";

type PublishedReview = ReviewDoc & {
  id: string;
  slug?: string;
  publishedAt?: string;
  productImage?: string;
  productPrice?: number;
};

const PAGE_SIZE = 12;

async function fetchPublishedReviews(
  maxCount: number,
  offset: number = 0
): Promise<{ reviews: PublishedReview[]; hasMore: boolean }> {
  try {
    // Use public reviews endpoint (no auth required)
    const data = await apiClient.get<{
      success: boolean;
      data: { reviews: PublishedReview[]; totalCount: number; hasMore: boolean };
    }>(`/api/reviews?limit=${maxCount}&offset=${offset}`);

    // Handle the response structure from automation-server
    if (data.success && data.data) {
      return {
        reviews: data.data.reviews || [],
        hasMore: data.data.hasMore || false,
      };
    }
    return { reviews: [], hasMore: false };
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
    return { reviews: [], hasMore: false };
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
  const reviewUrl = review.slug ? `/reviews/${review.slug}` : `/review/${review.id}`;

  return (
    <Link href={reviewUrl}>
      <article className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {review.category && (
              <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 mb-2">
                {review.category}
              </span>
            )}
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
              {review.author || "세모링크"}
            </span>
            <span>{formatDate(review.createdAt || "")}</span>
          </div>
          <span className="inline-flex items-center gap-1 font-medium text-blue-600 group-hover:text-blue-700 transition">
            자세히 보기
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </article>
    </Link>
  );
}

function ReviewCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-16 mb-3" />
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
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
      >
        홈으로 돌아가기
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

function ReviewsPageContent() {
  const searchParams = useSearchParams();
  const sortParam = searchParams.get("sort") || "latest";

  const [reviews, setReviews] = useState<PublishedReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    async function loadReviews() {
      try {
        setIsLoading(true);
        setError(null);
        const result = await fetchPublishedReviews(PAGE_SIZE);
        setReviews(result.reviews);
        setHasMore(result.hasMore);
      } catch (err) {
        console.error("리뷰 로딩 실패:", err);
        setError("리뷰를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    }
    loadReviews();
  }, []);

  const loadMore = async () => {
    if (isLoadingMore) return;
    try {
      setIsLoadingMore(true);
      const result = await fetchPublishedReviews(PAGE_SIZE, reviews.length);
      setReviews((prev) => [...prev, ...result.reviews]);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("추가 로딩 실패:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const filteredReviews = activeCategory === "all"
    ? reviews
    : reviews.filter((r) => r.category === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/50 to-white">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="font-bold text-slate-900">쿠팡 리뷰</span>
            </Link>
            <Link href="/admin" className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition">
              관리자
            </Link>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-700 transition">홈</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-900 font-medium">리뷰 목록</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {sortParam === "popular" ? "인기 리뷰" : "모든 리뷰"}
          </h1>
          <p className="mt-2 text-slate-600">
            다양한 카테고리의 쿠팡 파트너스 상품 리뷰를 확인하세요.
          </p>
        </div>
      </div>

      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {error && (
          <div className="mb-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <ReviewCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredReviews.length > 0 ? (
          <>
            <div className="mb-4 text-sm text-slate-500">
              총 {filteredReviews.length}개의 리뷰
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>

            {hasMore && activeCategory === "all" && (
              <div className="mt-10 text-center">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600" />
                      로딩 중...
                    </>
                  ) : (
                    <>
                      더 보기
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
              </div>
              <span>세모링크</span>
            </div>
            <p>&copy; {new Date().getFullYear()} Coupang Partners Auto Blog</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ReviewsPageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-4" />
          <div className="h-4 bg-slate-100 rounded w-64" />
        </div>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<ReviewsPageFallback />}>
      <ReviewsPageContent />
    </Suspense>
  );
}

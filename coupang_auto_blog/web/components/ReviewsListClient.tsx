"use client";

import { useState } from "react";
import Link from "next/link";

interface PublishedReview {
  id: string;
  slug?: string;
  productName?: string;
  content?: string;
  category?: string;
  createdAt?: string;
}

const PAGE_SIZE = 12;

const categories = [
  { name: "전체", slug: "all" },
  { name: "라이프스타일", slug: "lifestyle" },
  { name: "디지털/가전", slug: "digital" },
  { name: "주방/쿠킹", slug: "kitchen" },
  { name: "패션/뷰티", slug: "fashion" },
];

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

function truncateContent(content: string, maxLength = 120): string {
  if (!content) return "";
  const plainText = stripHtmlTags(content);
  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength) + "...";
}

function ReviewCard({ review }: { review: PublishedReview }) {
  const reviewUrl = review.slug
    ? `/reviews/${review.slug}`
    : `/review/${review.id}`;

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
          <span suppressHydrationWarning>{formatDate(review.createdAt || "")}</span>
          <span className="inline-flex items-center gap-1 font-medium text-blue-600 group-hover:text-blue-700 transition">
            자세히 보기
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </div>
      </article>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        아직 게시된 리뷰가 없습니다
      </h3>
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

export function ReviewsListClient({
  initialReviews,
  initialHasMore,
}: {
  initialReviews: PublishedReview[];
  initialHasMore: boolean;
}) {
  const [reviews, setReviews] = useState<PublishedReview[]>(initialReviews);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

  const loadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/reviews?limit=${PAGE_SIZE}&offset=${reviews.length}`
      );
      const data = await res.json();
      if (data.success && data.data) {
        setReviews((prev) => [...prev, ...(data.data.reviews || [])]);
        setHasMore(data.data.hasMore || false);
      }
    } catch (err) {
      console.error("추가 로딩 실패:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const filteredReviews =
    activeCategory === "all"
      ? reviews
      : reviews.filter((r) => r.category === activeCategory);

  return (
    <>
      {/* Category filter */}
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

      {/* Review grid */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {filteredReviews.length > 0 ? (
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
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
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
    </>
  );
}

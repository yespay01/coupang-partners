"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getReviewById, type ReviewDoc } from "@/lib/firestore";

function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// 콘텐츠 파싱 - HTML 또는 마크다운 지원
function parseContent(content: string): string {
  if (!content) return "";

  // HTML 태그가 포함되어 있으면 HTML로 간주
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (isHtml) {
    // HTML 콘텐츠: 그대로 반환 (보안상 신뢰할 수 있는 소스에서만)
    return content;
  }

  // 마크다운 콘텐츠: 기존 파싱 로직 (하위 호환성)
  const html = content
    // 이미지: ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-xl max-w-full my-4" />')
    // 영상 링크: [영상: name](url)
    .replace(/\[영상:\s*([^\]]*)\]\(([^)]+)\)/g, '<video src="$2" controls class="rounded-xl max-w-full my-4"><a href="$2">$1</a></video>')
    // 일반 링크: [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // 굵은 글씨: **text**
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // 줄바꿈
    .replace(/\n/g, '<br />');

  return html;
}

export default function ReviewDetailPage() {
  const params = useParams();
  const reviewId = params.id as string;

  const [review, setReview] = useState<ReviewDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReview() {
      if (!reviewId) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await getReviewById(reviewId);
        if (data) {
          setReview(data);
        } else {
          setError("리뷰를 찾을 수 없습니다.");
        }
      } catch (err) {
        console.error("리뷰 로드 실패:", err);
        setError("리뷰를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    loadReview();
  }, [reviewId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-12">
            <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              {error || "리뷰를 찾을 수 없습니다"}
            </h1>
            <p className="text-slate-500 mb-6">
              요청하신 리뷰가 존재하지 않거나 삭제되었을 수 있습니다.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="font-bold text-slate-900">쿠팡 리뷰</span>
            </Link>
            <Link
              href="/admin"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              관리자
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-700 transition">홈</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-900 font-medium truncate max-w-[200px]">
              {review.productName || "리뷰"}
            </span>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {review.category && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  {review.category}
                </span>
              )}
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                review.status === "published"
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {review.status === "published" ? "게시됨" : review.status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              {review.productName || `상품 리뷰`}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {review.author || "AI 리뷰어"}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(review.createdAt || "")}
              </span>
              {review.charCount && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {review.charCount}자
                </span>
              )}
            </div>
          </header>

          {/* 미디어 갤러리 */}
          {review.media && review.media.length > 0 && (
            <div className="mb-8">
              <div className="grid gap-4 sm:grid-cols-2">
                {review.media.map((item, index) => (
                  <div key={index} className="rounded-xl overflow-hidden border border-slate-100">
                    {item.type === "image" ? (
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-64 object-cover"
                      />
                    ) : (
                      <video
                        src={item.url}
                        controls
                        className="w-full h-64 object-cover bg-black"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 본문 */}
          <div
            className="max-w-none text-slate-700 leading-relaxed review-content"
            dangerouslySetInnerHTML={{ __html: parseContent(review.content || "") }}
          />

          {/* CTA - 쿠팡 링크 */}
          {review.affiliateUrl && (
            <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">이 상품이 마음에 드셨나요?</p>
                  <p className="text-sm text-slate-600">쿠팡에서 최저가로 구매하세요!</p>
                </div>
                <a
                  href={review.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-lg shadow-blue-600/25"
                >
                  쿠팡에서 보기
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                * 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
              </p>
            </div>
          )}
        </article>

        {/* 하단 네비게이션 */}
        <div className="mt-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            목록으로 돌아가기
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
              </div>
              <span>쿠팡 파트너스 자동화 블로그</span>
            </div>
            <p>© {new Date().getFullYear()} Coupang Partners Auto Blog</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

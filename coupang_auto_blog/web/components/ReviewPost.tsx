"use client";

import Image from "next/image";
import Link from "next/link";
import { Review } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface ReviewPostProps {
  review: Review;
}

/**
 * 블로그 포스트 레이아웃 컴포넌트
 * 리뷰 상세 페이지에서 사용
 */
export default function ReviewPost({ review }: ReviewPostProps) {
  const publishedDate = review.publishedAt
    ? new Date(review.publishedAt)
    : new Date(review.createdAt || Date.now());

  const formattedDate = formatDistanceToNow(publishedDate, {
    addSuffix: true,
    locale: ko,
  });

  // 리뷰 본문을 HTML로 렌더링 (줄바꿈 처리)
  const renderContent = (content: string) => {
    return content.split("\n").map((line, index) => (
      <p key={index} className="mb-4">
        {line}
      </p>
    ));
  };

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {/* 썸네일 이미지 */}
      {review.productImage && (
        <div className="relative w-full aspect-video mb-8 rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={review.productImage}
            alt={review.productName || "상품 이미지"}
            fill
            className="object-contain"
            priority
          />
        </div>
      )}

      {/* 헤더 */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">
          {review.seoMeta?.title || `${review.productName} 리뷰`}
        </h1>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          {review.category && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
              {review.category}
            </span>
          )}
          <time dateTime={publishedDate.toISOString()}>{formattedDate}</time>
          {review.viewCount !== undefined && (
            <span>조회수 {review.viewCount.toLocaleString()}</span>
          )}
        </div>
      </header>

      {/* 리뷰 본문 */}
      <div className="prose prose-lg max-w-none mb-8">
        {review.content && renderContent(review.content)}
      </div>

      {/* 상품 정보 카드 */}
      <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-orange-50 to-amber-50 mb-8">
        <h2 className="text-xl font-semibold mb-2 text-gray-900">
          오늘의 쿠팡 가격 확인
        </h2>
        <p className="text-sm text-gray-700 mb-5">{review.productName}</p>

        {review.affiliateUrl && (
          <>
            <Link
              href={review.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group flex items-center justify-center gap-2 w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <span className="text-base sm:text-lg">쿠팡에서 최저가 확인하기</span>
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-orange-700">
              <span>💰</span>
              <span>회원 전용 추가 할인가 보기 · 로켓배송 가능</span>
            </p>
          </>
        )}

        <p className="text-xs text-gray-500 mt-5 text-center">
          이 포스트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
          제공받습니다.
        </p>
      </div>

      {/* 미디어 갤러리 (선택 사항) */}
      {review.media && review.media.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            추가 이미지
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {review.media.map((item, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
              >
                {item.type === "image" && (
                  <Image
                    src={item.url}
                    alt={`${review.productName} 이미지 ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 공유 및 관련 정보 (선택 사항) */}
      <footer className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <p>작성일: {publishedDate.toLocaleDateString("ko-KR")}</p>
            {review.updatedAt && review.updatedAt !== review.publishedAt && (
              <p>
                수정일:{" "}
                {new Date(review.updatedAt).toLocaleDateString("ko-KR")}
              </p>
            )}
          </div>

          {/* 소셜 공유 버튼 (선택 사항) */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: review.productName,
                    text: review.seoMeta?.description || review.content,
                    url: window.location.href,
                  });
                }
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              공유하기
            </button>
          </div>
        </div>
      </footer>
    </article>
  );
}

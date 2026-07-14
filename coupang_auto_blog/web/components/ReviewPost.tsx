"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Review } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface ReviewPostProps {
  review: Review;
}

const ArrowIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M13 7l5 5m0 0l-5 5m5-5H6"
    />
  </svg>
);

/** 쿠팡 이동 CTA 버튼 (상단/중간/하단 공용) */
function CoupangCTAButton({
  href,
  label,
  compact = false,
}: {
  href: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`group flex items-center justify-center gap-2 w-full ${
        compact ? "px-4 py-3" : "px-6 py-4"
      } bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all`}
    >
      <span className={compact ? "text-sm sm:text-base" : "text-base sm:text-lg"}>
        {label}
      </span>
      <ArrowIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
    </a>
  );
}

export default function ReviewPost({ review }: ReviewPostProps) {
  const publishedDate = review.publishedAt
    ? new Date(review.publishedAt)
    : new Date(review.createdAt || Date.now());

  const formattedDate = formatDistanceToNow(publishedDate, {
    addSuffix: true,
    locale: ko,
  });

  // 스크롤을 조금 내리면 하단 고정 CTA 표시
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const affiliateUrl = review.affiliateUrl;
  const priceText =
    review.productPrice && review.productPrice > 0
      ? `${review.productPrice.toLocaleString()}원`
      : null;

  // 본문을 문단 배열로 변환하고, 글이 길면 중간에 CTA 삽입 위치 계산
  const lines = (review.content || "").split("\n");
  const nonEmptyCount = lines.filter((l) => l.trim().length > 0).length;
  const midCtaIndex =
    affiliateUrl && nonEmptyCount >= 8 ? Math.floor(lines.length / 2) : -1;

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {/* 썸네일 이미지 — 클릭 시 쿠팡 상품 페이지 새 탭 */}
      {review.productImage && (
        <div className="relative w-full aspect-video mb-8 rounded-lg overflow-hidden bg-gray-100">
          {affiliateUrl ? (
            <a
              href={affiliateUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={`${review.productName} 쿠팡 상품 페이지 열기`}
              className="group block absolute inset-0"
            >
              <Image
                src={review.productImage}
                alt={review.productName || "상품 이미지"}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                priority
              />
              <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white">
                이미지 클릭 → 쿠팡에서 보기
              </span>
            </a>
          ) : (
            <Image
              src={review.productImage}
              alt={review.productName || "상품 이미지"}
              fill
              className="object-contain"
              priority
            />
          )}
        </div>
      )}

      {/* 헤더 */}
      <header className="mb-6">
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

      {/* 상단 CTA — 첫 화면에서 바로 보이는 최저가 버튼 */}
      {affiliateUrl && (
        <div className="mb-8 rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-4 sm:p-5">
          {priceText && (
            <p className="mb-3 text-center text-sm text-gray-700">
              쿠팡 판매가{" "}
              <strong className="text-lg text-red-600">{priceText}</strong>
              <span className="ml-1 text-xs text-gray-500">
                (가격은 변동될 수 있어요)
              </span>
            </p>
          )}
          <CoupangCTAButton
            href={affiliateUrl}
            label="👉 쿠팡 최저가 바로 확인하기"
          />
          <p className="mt-3 text-xs text-gray-500 text-center">
            이 포스트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의
            수수료를 제공받습니다.
          </p>
        </div>
      )}

      {/* 리뷰 본문 (글이 길면 중간에 CTA 1회 삽입) */}
      <div className="prose prose-lg max-w-none mb-8">
        {lines.map((line, index) => (
          <div key={index}>
            <p className="mb-4">{line}</p>
            {index === midCtaIndex && affiliateUrl && (
              <div className="not-prose my-8 rounded-xl border border-orange-100 bg-orange-50/60 p-4">
                <CoupangCTAButton
                  href={affiliateUrl}
                  label={`${review.productName ? `${review.productName} ` : ""}최저가 보러가기`}
                  compact
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 상품 정보 카드 */}
      <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-orange-50 to-amber-50 mb-8">
        <h2 className="text-xl font-semibold mb-2 text-gray-900">
          오늘의 쿠팡 가격 확인
        </h2>
        <p className="text-sm text-gray-700 mb-2">{review.productName}</p>
        {priceText && (
          <p className="text-sm text-gray-700 mb-5">
            쿠팡 판매가{" "}
            <strong className="text-lg text-red-600">{priceText}</strong>
          </p>
        )}

        {affiliateUrl && (
          <>
            <CoupangCTAButton
              href={affiliateUrl}
              label="쿠팡에서 최저가 확인하기"
            />
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

      {/* 하단 고정 CTA — 스크롤 어디서든 바로 클릭 가능 */}
      {affiliateUrl && (
        <div
          className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pt-2 transition-all duration-300 ${
            showSticky
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-full opacity-0"
          }`}
        >
          <div className="mx-auto max-w-4xl">
            <a
              href={affiliateUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3.5 text-white shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-shadow"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-orange-100">
                  {review.productName}
                </span>
                <span className="block text-sm sm:text-base font-bold">
                  쿠팡 최저가 보러가기{priceText ? ` · ${priceText}` : ""}
                </span>
              </span>
              <ArrowIcon className="w-6 h-6 shrink-0 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      )}
    </article>
  );
}

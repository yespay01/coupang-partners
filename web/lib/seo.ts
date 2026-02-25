/**
 * SEO 메타데이터 생성 유틸리티
 */

import { Review, SEOMeta } from "@/types";

/**
 * 리뷰 본문에서 설명 추출
 * HTML 태그 제거 및 길이 제한
 */
function extractDescription(content: string, maxLength: number = 160): string {
  if (!content) return "";

  // HTML 태그 제거
  const plainText = content
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length <= maxLength) return plainText;

  // maxLength에서 자르되, 마지막 단어가 잘리지 않도록
  const truncated = plainText.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength - 20) {
    return truncated.slice(0, lastSpace) + "...";
  }

  return truncated + "...";
}

/**
 * 상품명에서 키워드 추출
 */
function extractKeywords(productName: string, category?: string): string[] {
  const keywords: string[] = [];

  // 기본 키워드
  keywords.push("쿠팡");
  keywords.push("리뷰");
  keywords.push("추천");

  // 카테고리 추가
  if (category) {
    keywords.push(category);
  }

  // 상품명에서 주요 단어 추출 (간단한 방식)
  const words = productName
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1);

  // 상위 3-5개 단어 추가
  keywords.push(...words.slice(0, 5));

  // 중복 제거 및 정리
  return Array.from(new Set(keywords));
}

/**
 * 리뷰에서 SEO 메타데이터 생성
 * @param review 리뷰 데이터
 * @param options 추가 옵션
 * @returns SEO 메타데이터
 */
export function generateSEOMeta(
  review: Review,
  options?: {
    siteName?: string;
    titleSuffix?: string;
  }
): SEOMeta {
  const siteName = options?.siteName || "쿠팡 리뷰";
  const titleSuffix = options?.titleSuffix || ` | ${siteName}`;

  // 제목 생성 (50-60자)
  const baseTitle = `${review.productName} 리뷰`;
  const title =
    baseTitle.length + titleSuffix.length > 60
      ? baseTitle.slice(0, 60 - titleSuffix.length) + titleSuffix
      : baseTitle + titleSuffix;

  // 설명 생성 (150-160자)
  const description = extractDescription(review.content || "", 150);

  // 키워드 생성
  const keywords = extractKeywords(
    review.productName || "",
    review.category
  );

  // Open Graph 이미지
  const ogImage = review.productImage || "";

  return {
    title,
    description,
    keywords,
    ogImage,
  };
}

/**
 * Open Graph 메타 태그 생성
 */
export function generateOpenGraphMeta(
  review: Review,
  seoMeta: SEOMeta,
  url: string
) {
  return {
    title: seoMeta.title,
    description: seoMeta.description,
    images: seoMeta.ogImage ? [{ url: seoMeta.ogImage }] : [],
    type: "article" as const,
    url,
    siteName: "쿠팡 리뷰 블로그",
    publishedTime: review.publishedAt,
    modifiedTime: review.updatedAt,
  };
}

/**
 * Twitter Card 메타 태그 생성
 */
export function generateTwitterMeta(seoMeta: SEOMeta) {
  return {
    card: "summary_large_image" as const,
    title: seoMeta.title,
    description: seoMeta.description,
    images: seoMeta.ogImage ? [seoMeta.ogImage] : [],
  };
}

/**
 * 구조화된 데이터 (Schema.org) 생성
 */
export function generateStructuredData(review: Review) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: review.productName,
    image: review.productImage,
    description: extractDescription(review.content || "", 200),
    review: {
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "4.5",
        bestRating: "5",
      },
      author: {
        "@type": "Organization",
        name: "쿠팡 리뷰 블로그",
      },
      reviewBody: review.content,
      datePublished: review.publishedAt,
    },
    offers: review.productPrice
      ? {
          "@type": "Offer",
          price: review.productPrice,
          priceCurrency: "KRW",
          availability: "https://schema.org/InStock",
          url: review.affiliateUrl,
        }
      : undefined,
  };
}

/**
 * 페이지 메타데이터 생성 (Next.js Metadata 형식)
 */
export function generatePageMetadata(review: Review, pageUrl: string) {
  const seoMeta = review.seoMeta || generateSEOMeta(review);

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    openGraph: generateOpenGraphMeta(review, seoMeta, pageUrl),
    twitter: generateTwitterMeta(seoMeta),
    alternates: {
      canonical: pageUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

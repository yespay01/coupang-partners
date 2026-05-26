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

// 검색량은 낮고 키워드 노이즈만 늘리는 단어
const STOP_WORDS = new Set([
  "신제품", "정품", "단품", "세트", "벌크", "본품", "사은품",
  "무료배송", "당일배송", "로켓배송", "특가", "할인", "쿠폰",
  "공식", "공식판매", "정식수입", "정식수입품", "병행수입",
  "선물", "선물용", "기프트", "박스", "패키지",
  "구매", "판매", "추천", "리뷰", "후기",
  "ml", "kg", "g", "mm", "cm", "inch", "color", "size",
]);

/**
 * 상품명에서 모델 코드/노이즈를 제거하고 검색 친화적 키워드 추출
 *
 * 예) "삼성전자 갤럭시 버즈3 프로 SM-R630NLAAKOO 블루투스 이어폰 신제품"
 *  → ["갤럭시 버즈3 프로", "삼성전자", "블루투스", "이어폰", ...]
 */
function extractKeywords(productName: string, category?: string): string[] {
  const cleaned = (productName || "")
    // 괄호 안 부가설명 제거 ((정품), [공식] 등)
    .replace(/[\[(（【].*?[\])）】]/g, " ")
    // 모델 코드 제거: 영문 대문자/숫자/하이픈 4자 이상 연속
    .replace(/\b[A-Z0-9][A-Z0-9-]{3,}\b/g, " ")
    // 색상 표기 제거 (예: "블랙/화이트")
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => {
      if (t.length < 2) return false;
      if (STOP_WORDS.has(t.toLowerCase())) return false;
      // 숫자만 있는 토큰 제거
      if (/^\d+$/.test(t)) return false;
      return true;
    });

  // 중복 제거하며 순서 유지 (앞 토큰일수록 상품의 핵심 키워드)
  const seen = new Set<string>();
  const coreTokens: string[] = [];
  for (const t of tokens) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    coreTokens.push(t);
    if (coreTokens.length >= 6) break;
  }

  const keywords: string[] = [];

  // 핵심 구문 (앞 2-3 토큰 결합) - 검색엔진 롱테일 매칭
  if (coreTokens.length >= 2) {
    keywords.push(coreTokens.slice(0, Math.min(3, coreTokens.length)).join(" "));
  }

  // 개별 핵심 키워드
  keywords.push(...coreTokens);

  // 카테고리
  if (category && !seen.has(category.toLowerCase())) {
    keywords.push(category);
  }

  // 검색 의도 키워드
  keywords.push("최저가", "쿠팡", "후기");

  return Array.from(new Set(keywords)).filter(Boolean);
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
  const siteName = options?.siteName || "세모링크";
  const titleSuffix = options?.titleSuffix || ` | ${siteName}`;

  // 키워드 먼저 추출 (제목에도 활용)
  const keywords = extractKeywords(review.productName || "", review.category);
  // 첫 항목이 핵심 구문이면 그것을, 아니면 첫 키워드 사용
  const headKeyword = keywords[0] || review.productName || "";

  // 제목: "핵심키워드 쿠팡 최저가 후기" — 검색 매칭 강화
  const baseTitle = `${headKeyword} 쿠팡 최저가 후기`;
  const title =
    baseTitle.length + titleSuffix.length > 60
      ? baseTitle.slice(0, 60 - titleSuffix.length) + titleSuffix
      : baseTitle + titleSuffix;

  // 설명 생성 (150-160자)
  const description = extractDescription(review.content || "", 150);

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

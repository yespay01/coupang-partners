import { notFound } from "next/navigation";
import { Metadata } from "next";
import ReviewPost from "@/components/ReviewPost";
import { Review } from "@/types";

// ISR: 1시간마다 재생성
export const revalidate = 3600;

// 동적 경로 허용 (빌드 시 정적 생성 안 함)
export const dynamicParams = true;

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

interface PageProps {
  params: {
    slug: string;
  };
}

/**
 * slug로 리뷰 조회 (automation-server API)
 */
async function getReviewBySlug(slug: string): Promise<Review | null> {
  try {
    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/reviews/${encodeURIComponent(slug)}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      return null;
    }

    return result.data as Review;
  } catch (error) {
    console.error("리뷰 조회 실패:", error);
    return null;
  }
}

/**
 * SEO 메타데이터 생성
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const review = await getReviewBySlug(params.slug);

  if (!review) {
    return {
      title: "리뷰를 찾을 수 없습니다",
    };
  }

  const seoMeta = review.seoMeta || {
    title: `${review.productName} 리뷰`,
    description: review.content?.slice(0, 150) || "",
    keywords: [review.category || "쿠팡", "리뷰"],
    ogImage: review.productImage || "",
  };

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    keywords: seoMeta.keywords,
    openGraph: {
      title: seoMeta.title,
      description: seoMeta.description,
      images: seoMeta.ogImage ? [seoMeta.ogImage] : [],
      type: "article",
      publishedTime: review.publishedAt,
      modifiedTime: review.updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: seoMeta.title,
      description: seoMeta.description,
      images: seoMeta.ogImage ? [seoMeta.ogImage] : [],
    },
  };
}

/**
 * 리뷰 상세 페이지
 */
export default async function ReviewPage({ params }: PageProps) {
  const review = await getReviewBySlug(params.slug);

  // 404 처리
  if (!review) {
    notFound();
  }

  // 구조화된 데이터 (Schema.org)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: review.productName,
    image: review.productImage,
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
    offers: {
      "@type": "Offer",
      price: review.productPrice,
      priceCurrency: "KRW",
      availability: "https://schema.org/InStock",
      url: review.affiliateUrl,
    },
  };

  return (
    <>
      {/* 구조화된 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* 리뷰 포스트 */}
      <ReviewPost review={review} />
    </>
  );
}

/**
 * 정적 경로 생성 - 빈 배열 반환 (dynamicParams=true로 런타임에 동적 처리)
 * 빌드 중 automation-server가 없으므로 API 호출 안 함
 */
export async function generateStaticParams() {
  return [];
}

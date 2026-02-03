import { notFound } from "next/navigation";
import { Metadata } from "next";
import ReviewPost from "@/components/ReviewPost";
import { Review } from "@/types";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, increment, updateDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";

// ISR: 1시간마다 재생성
export const revalidate = 3600;

// 동적 경로 허용 (빌드 시 정적 생성 안 함)
export const dynamicParams = true;

interface PageProps {
  params: {
    slug: string;
  };
}

/**
 * slug로 리뷰 조회
 */
async function getReviewBySlug(slug: string): Promise<Review | null> {
  const db = getFirestore(app);
  const reviewsRef = collection(db, "reviews");

  // slug로 쿼리
  const q = query(
    reviewsRef,
    where("slug", "==", slug),
    where("status", "==", "published")
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    publishedAt: data.publishedAt?.toDate?.()?.toISOString() || data.publishedAt,
    lastViewedAt: data.lastViewedAt?.toDate?.()?.toISOString() || data.lastViewedAt,
  } as Review;
}

/**
 * 조회수 증가 (클라이언트에서 호출)
 */
async function incrementViewCount(reviewId: string) {
  try {
    const db = getFirestore(app);
    const reviewRef = doc(db, "reviews", reviewId);

    await updateDoc(reviewRef, {
      viewCount: increment(1),
      lastViewedAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to increment view count:", error);
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
 * 정적 경로 생성 (빌드 시에는 빈 배열 반환)
 * 실제 경로는 런타임에 동적으로 생성됨
 */
export async function generateStaticParams() {
  // 빌드 시에는 정적 생성하지 않고, 런타임에 동적으로 처리
  return [];
}

import { Metadata } from "next";
import Link from "next/link";
import { ReviewsListClient } from "@/components/ReviewsListClient";

export const metadata: Metadata = {
  title: "리뷰 목록 | 세모링크",
  description:
    "다양한 카테고리의 상품 리뷰를 확인하세요. 라이프스타일, 디지털/가전, 주방/쿠킹, 패션/뷰티 등 다양한 리뷰가 준비되어 있습니다.",
  alternates: {
    canonical: "https://semolink.store/reviews",
  },
  openGraph: {
    title: "리뷰 목록 | 세모링크",
    description: "다양한 카테고리의 상품 리뷰를 확인하세요.",
    type: "website",
  },
};

export const dynamic = 'force-dynamic';

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

const PAGE_SIZE = 12;

interface PublishedReview {
  id: string;
  slug?: string;
  productName?: string;
  content?: string;
  category?: string;
  createdAt?: string;
}

async function fetchInitialReviews(): Promise<{
  reviews: PublishedReview[];
  hasMore: boolean;
}> {
  if (process.env.NEXT_PHASE === 'phase-production-build') return { reviews: [], hasMore: false };
  try {
    const res = await fetch(
      `${AUTOMATION_SERVER_URL}/api/reviews?limit=${PAGE_SIZE}&offset=0`,
      { cache: 'no-store' }
    );
    if (!res.ok) return { reviews: [], hasMore: false };
    const data = await res.json();
    if (data.success && data.data) {
      return {
        reviews: data.data.reviews || [],
        hasMore: data.data.hasMore || false,
      };
    }
    return { reviews: [], hasMore: false };
  } catch {
    return { reviews: [], hasMore: false };
  }
}

interface PageProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function ReviewsPage({ searchParams }: PageProps) {
  const { sort } = await searchParams;
  const { reviews, hasMore } = await fetchInitialReviews();

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
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-700 transition">
              홈
            </Link>
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
            <span className="text-slate-900 font-medium">리뷰 목록</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {sort === "popular" ? "인기 리뷰" : "모든 리뷰"}
          </h1>
          <p className="mt-2 text-slate-600">
            다양한 카테고리의 상품 리뷰를 확인하세요.
          </p>
        </div>
      </div>

      <ReviewsListClient initialReviews={reviews} initialHasMore={hasMore} />

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

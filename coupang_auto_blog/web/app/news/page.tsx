import { Metadata } from "next";
import Link from "next/link";
import { NewsListClient } from "@/components/NewsListClient";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "뉴스 | 세모링크",
  description:
    "최신 소비 트렌드와 쇼핑 뉴스를 전해드립니다. 세모링크에서 트렌드를 확인하세요.",
  alternates: {
    canonical: "https://semolink.store/news",
  },
  openGraph: {
    title: "뉴스 | 세모링크",
    description: "최신 소비 트렌드와 쇼핑 뉴스를 전해드립니다.",
    type: "website",
  },
};

export const dynamic = 'force-dynamic';

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

const PAGE_SIZE = 12;

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  slug: string;
  viewCount: number;
  publishedAt: string;
  createdAt: string;
}

async function fetchInitialNews(): Promise<{
  news: NewsItem[];
  hasMore: boolean;
}> {
  if (process.env.NEXT_PHASE === 'phase-production-build') return { news: [], hasMore: false };
  try {
    const res = await fetch(
      `${AUTOMATION_SERVER_URL}/api/news?limit=${PAGE_SIZE}&offset=0`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return { news: [], hasMore: false };
    const data = await res.json();
    if (data.success && data.data) {
      return {
        news: data.data.news || [],
        hasMore: data.data.hasMore || false,
      };
    }
    return { news: [], hasMore: false };
  } catch {
    return { news: [], hasMore: false };
  }
}

export default async function NewsPage() {
  const { news, hasMore } = await fetchInitialNews();

  return (
    <div className="min-h-screen bg-white selection:bg-amber-50">
      <SiteHeader />

      <div className="bg-white border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 pt-24">
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
            <span className="text-slate-900 font-medium">뉴스</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            뉴스
          </h1>
          <p className="mt-2 text-slate-600">
            최신 소비 트렌드와 쇼핑 뉴스를 전해드립니다.
          </p>
        </div>
      </div>

      <NewsListClient initialNews={news} initialHasMore={hasMore} />

      <SiteFooter />
    </div>
  );
}

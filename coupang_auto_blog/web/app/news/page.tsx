"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

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

const PAGE_SIZE = 12;

export default function NewsPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const data = await apiClient.get<{
          success: boolean;
          data: { news: NewsItem[]; hasMore: boolean };
        }>(`/api/news?limit=${PAGE_SIZE}&offset=0`);

        if (data.success && data.data) {
          setNewsList(data.data.news);
          setHasMore(data.data.hasMore);
        }
      } catch (err) {
        console.error("뉴스 로딩 실패:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const loadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await apiClient.get<{
        success: boolean;
        data: { news: NewsItem[]; hasMore: boolean };
      }>(`/api/news?limit=${PAGE_SIZE}&offset=${newsList.length}`);

      if (data.success && data.data) {
        setNewsList((prev) => [...prev, ...data.data.news]);
        setHasMore(data.data.hasMore);
      }
    } catch (err) {
      console.error("추가 로딩 실패:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-white selection:bg-amber-50">
      <SiteHeader />

      <div className="bg-white border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 pt-24">
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-700 transition">홈</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-900 font-medium">뉴스</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">뉴스</h1>
          <p className="mt-2 text-slate-600">
            최신 소비 트렌드와 쇼핑 뉴스를 전해드립니다.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-16 mb-3" />
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : newsList.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-700 mb-2">아직 게시된 뉴스가 없습니다</h3>
            <p className="text-sm text-slate-500 mb-6">곧 새로운 뉴스가 올라올 예정입니다.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              홈으로 돌아가기
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-slate-500">총 {newsList.length}개의 뉴스</div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {newsList.map((news) => (
                <Link key={news.id} href={`/news/${news.id}`}>
                  <article className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg cursor-pointer">
                    {news.category && (
                      <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 mb-2">
                        {news.category}
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-2">
                      {news.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                      {news.summary}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {new Date(news.publishedAt || news.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-blue-600 group-hover:text-blue-700 transition">
                        자세히 보기
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  {isLoadingMore ? "로딩 중..." : "더 보기"}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

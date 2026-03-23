"use client";

import { useState } from "react";
import Link from "next/link";

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

export function NewsListClient({
  initialNews,
  initialHasMore,
}: {
  initialNews: NewsItem[];
  initialHasMore: boolean;
}) {
  const [newsList, setNewsList] = useState<NewsItem[]>(initialNews);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/news?limit=${PAGE_SIZE}&offset=${newsList.length}`
      );
      const data = await res.json();
      if (data.success && data.data) {
        setNewsList((prev) => [...prev, ...(data.data.news || [])]);
        setHasMore(data.data.hasMore || false);
      }
    } catch (err) {
      console.error("추가 로딩 실패:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (newsList.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            아직 게시된 뉴스가 없습니다
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            곧 새로운 뉴스가 올라올 예정입니다.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-4 text-sm text-slate-500">
        총 {newsList.length}개의 뉴스
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {newsList.map((news) => (
          <Link key={news.id} href={`/news/${news.slug || news.id}`}>
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
                <span suppressHydrationWarning>
                  {new Date(
                    news.publishedAt || news.createdAt
                  ).toLocaleDateString("ko-KR")}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-blue-600 group-hover:text-blue-700 transition">
                  자세히 보기
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
    </main>
  );
}

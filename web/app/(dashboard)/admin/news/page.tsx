"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  imageUrl: string | null;
  slug: string;
  status: string;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const NEWS_CATEGORIES = ["트렌드", "소비", "테크", "라이프", "경제"];

export default function AdminNewsPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("트렌드");
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        success: boolean;
        data: { news: NewsItem[]; totalCount: number };
      }>("/api/admin/news?limit=50");

      if (data.success && data.data) {
        setNewsList(data.data.news);
      }
    } catch (err) {
      console.error("뉴스 목록 로딩 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleGenerate = async () => {
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    setMessage(null);
    try {
      const data = await apiClient.post<{
        success: boolean;
        message: string;
        data?: { newsId: number; title: string };
      }>("/api/admin/news/generate", { topic: topic.trim(), category });

      if (data.success) {
        setMessage({
          type: "success",
          text: `"${data.data?.title}" 뉴스 생성 완료!`,
        });
        setTopic("");
        fetchNews();
      } else {
        setMessage({ type: "error", text: data.message || "생성 실패" });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "생성 중 오류 발생";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const data = await apiClient.put<{ success: boolean }>(`/api/admin/news/${id}`, {
        status: "published",
      });
      if (data.success) {
        fetchNews();
        setMessage({ type: "success", text: "뉴스가 발행되었습니다." });
      }
    } catch (err) {
      console.error("발행 실패:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await apiClient.delete(`/api/admin/news/${id}`);
      fetchNews();
      setMessage({ type: "success", text: "뉴스가 삭제되었습니다." });
    } catch (err) {
      console.error("삭제 실패:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">뉴스 관리</h1>
          <p className="mt-1 text-sm text-slate-500">
            주제를 입력하면 AI가 소비/트렌드 뉴스 기사를 생성합니다.
          </p>
        </div>

        {message && (
          <div
            className={`rounded-lg border p-4 text-sm ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 생성 폼 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">새 뉴스 생성</h2>
          <div className="flex gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isGenerating}
            >
              {NEWS_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="뉴스 주제를 입력하세요 (예: 2026년 소비 트렌드, MZ세대 쇼핑 습관)"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isGenerating}
            />
            <button
              onClick={handleGenerate}
              disabled={!topic.trim() || isGenerating}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  생성 중...
                </span>
              ) : (
                "AI 뉴스 생성"
              )}
            </button>
          </div>
        </div>

        {/* 뉴스 목록 */}
        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
            <p className="mt-4 text-sm text-slate-600">뉴스 목록을 불러오는 중...</p>
          </div>
        ) : newsList.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-500">아직 생성된 뉴스가 없습니다.</p>
            <p className="mt-1 text-sm text-slate-400">위에서 주제를 입력하여 첫 뉴스를 생성해보세요.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-slate-500">총 {newsList.length}개의 뉴스</div>
            {newsList.map((news) => (
              <div
                key={news.id}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{news.title}</h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          news.status === "published"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {news.status === "published" ? "발행됨" : "초안"}
                      </span>
                      {news.category && (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {news.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{news.summary}</p>
                    <div className="mt-2 flex gap-4 text-xs text-slate-500">
                      <span>조회수 {news.viewCount}</span>
                      <span>{new Date(news.createdAt).toLocaleDateString("ko-KR")}</span>
                      {news.publishedAt && (
                        <span>발행: {new Date(news.publishedAt).toLocaleDateString("ko-KR")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {news.status === "draft" && (
                      <button
                        onClick={() => handlePublish(news.id)}
                        className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-50"
                      >
                        발행
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(news.id)}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

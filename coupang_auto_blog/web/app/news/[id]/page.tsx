import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const revalidate = 3600;
export const dynamicParams = true;

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  viewCount: number;
  publishedAt: string;
  createdAt: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getNews(id: string): Promise<NewsItem | null> {
  try {
    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/news/id/${id}`,
      { next: { revalidate: 3600 } }
    );
    if (!response.ok) return null;
    const result = await response.json();
    if (!result.success || !result.data) return null;
    return result.data as NewsItem;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const news = await getNews(id);
  if (!news) return { title: "뉴스를 찾을 수 없습니다" };

  return {
    title: news.title,
    description: news.summary,
    openGraph: {
      title: news.title,
      description: news.summary,
      type: "article",
      publishedTime: news.publishedAt,
    },
  };
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { id } = await params;
  const news = await getNews(id);
  if (!news) notFound();

  return (
    <div className="min-h-screen bg-white selection:bg-amber-50">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 pt-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition">홈</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/news" className="hover:text-slate-700 transition">뉴스</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-medium line-clamp-1">{news.title}</span>
        </nav>

        {/* Category badge */}
        {news.category && (
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 mb-4">
            {news.category}
          </span>
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-tight">{news.title}</h1>

        {/* Meta */}
        <div className="flex gap-4 text-sm text-slate-500 mb-8 pb-6 border-b border-slate-200">
          <span>
            {new Date(news.publishedAt || news.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span>조회수 {news.viewCount}</span>
        </div>

        {/* Summary */}
        {news.summary && (
          <div className="mb-8 rounded-xl bg-slate-50 p-6 border border-slate-100">
            <p className="text-slate-700 font-medium leading-relaxed">{news.summary}</p>
          </div>
        )}

        {/* Content */}
        <article className="prose prose-slate max-w-none">
          {news.content?.split("\n").map((paragraph, i) =>
            paragraph.trim() ? (
              <p key={i} className="text-slate-700 leading-relaxed mb-4">
                {paragraph}
              </p>
            ) : null
          )}
        </article>

        {/* Back */}
        <div className="border-t border-slate-200 pt-8 mt-12">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            뉴스 목록으로
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export async function generateStaticParams() {
  return [];
}

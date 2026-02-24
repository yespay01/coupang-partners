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
  updatedAt?: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getNews(slugOrId: string): Promise<NewsItem | null> {
  try {
    // 숫자면 ID로 조회 (기존 링크 호환)
    if (/^\d+$/.test(slugOrId)) {
      const response = await fetch(
        `${AUTOMATION_SERVER_URL}/api/news/id/${slugOrId}`,
        { next: { revalidate: 3600 } }
      );
      if (!response.ok) return null;
      const result = await response.json();
      if (!result.success || !result.data) return null;
      return result.data as NewsItem;
    }

    // 슬러그로 조회 (인코딩 문제 방지를 위해 쿼리 파라미터 사용)
    const url = new URL(`${AUTOMATION_SERVER_URL}/api/news/by-slug`);
    url.searchParams.set("slug", slugOrId);
    const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
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

  const description = news.summary ? news.summary.slice(0, 160) : news.title;

  return {
    title: news.title,
    description,
    keywords: [news.title, news.category, "뉴스", "세모링크"].filter(Boolean),
    alternates: {
      canonical: `https://semolink.store/news/${id}`,
    },
    openGraph: {
      title: news.title,
      description,
      type: "article",
      publishedTime: news.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: news.title,
      description,
    },
  };
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { id } = await params;
  const news = await getNews(id);
  if (!news) notFound();

  const description = news.summary ? news.summary.slice(0, 160) : news.title;

  const publishedIso = new Date(news.publishedAt || news.createdAt).toISOString();
  const modifiedIso = new Date(news.updatedAt || news.publishedAt || news.createdAt).toISOString();

  const newsJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: news.title,
    description,
    datePublished: publishedIso,
    dateModified: modifiedIso,
    author: {
      "@type": "Organization",
      name: "세모링크",
      url: "https://semolink.store",
    },
    publisher: {
      "@type": "Organization",
      name: "세모링크",
      url: "https://semolink.store",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://semolink.store/news/${id}`,
    },
    ...(news.category ? { articleSection: news.category } : {}),
  };

  return (
    <div className="min-h-screen bg-white selection:bg-amber-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsJsonLd) }}
      />

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
          <time dateTime={publishedIso}>
            {new Date(news.publishedAt || news.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
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

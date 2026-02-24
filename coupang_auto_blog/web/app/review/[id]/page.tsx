"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { type ReviewDoc } from "@/lib/firestore";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function parseContent(content: string): string {
  if (!content) return "";
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  if (isHtml) return content;
  return content.replace(/\n/g, '<br />');
}

export default function ReviewDetailPage() {
  const params = useParams();
  const reviewId = params.id as string;
  const [review, setReview] = useState<ReviewDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReview() {
      if (!reviewId) return;
      try {
        const res = await fetch(`/api/reviews/${reviewId}`);
        const json = await res.json();
        if (json.success && json.data) setReview(json.data);
        else setError("리뷰를 찾을 수 없습니다.");
      } catch (err) {
        setError("로드 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    }
    loadReview();
  }, [reviewId]);

  if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /></div>;
  if (error || !review) return <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center"><h1 className="text-2xl font-serif mb-4">{error}</h1><Link href="/" className="text-xs font-bold tracking-widest uppercase border-b border-black">홈으로 돌아가기</Link></div>;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main className="pt-36 pb-32">
        <article className="mx-auto max-w-3xl px-6">
          <header className="text-center mb-20">
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-amber-700/60">{review.category || "Curation"}</span>
              <span className="w-1 h-1 rounded-full bg-slate-200" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-slate-400">{formatDate(review.createdAt || "")}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 leading-tight mb-10">
              {review.productName}
            </h1>
          </header>

          {review.media && review.media.length > 0 && (
            <div className="mb-20 space-y-8">
              {review.media.map((item, index) => (
                <div key={index} className="overflow-hidden bg-slate-50">
                  {item.type === "image" ? (
                    <img src={item.url} alt="" className="w-full h-auto" />
                  ) : (
                    <video src={item.url} controls className="w-full aspect-video bg-black" />
                  )}
                </div>
              ))}
            </div>
          )}

          <div
            className="prose prose-slate max-w-none review-content mb-32"
            dangerouslySetInnerHTML={{ __html: parseContent(review.content || "") }}
          />

          {review.affiliateUrl && (
            <div className="border-y border-slate-100 py-20 text-center">
              <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-amber-700/60 mb-6 block">EXPLORE MORE</span>
              <h3 className="text-2xl font-serif font-bold mb-10">이 제품을 더 자세히 알아보고 싶으신가요?</h3>
              <a
                href={review.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex px-12 py-5 bg-slate-900 text-white text-xs font-bold tracking-widest uppercase rounded-full hover:bg-slate-800 transition-transform active:scale-95 shadow-xl shadow-slate-200"
              >
                쿠팡에서 확인하기
              </a>
              <p className="mt-12 text-[9px] text-slate-400 font-serif italic max-w-xs mx-auto leading-relaxed">
                * 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
              </p>
            </div>
          )}

          <div className="mt-20 flex justify-center">
            <Link href="/" className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-3 group">
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              목록으로 돌아가기
            </Link>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type ReviewDoc } from "@/lib/firestore";

type PublishedReview = ReviewDoc & {
  id: string;
};

async function fetchPublishedReviews(maxCount: number, retries = 2): Promise<PublishedReview[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`/api/reviews?limit=${maxCount}&statuses=published`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Attempt multiple data extraction patterns based on API response
      if (Array.isArray(data.data)) return data.data;
      if (data.data && Array.isArray(data.data.reviews)) return data.data.reviews;
      if (Array.isArray(data.reviews)) return data.reviews;
      if (Array.isArray(data)) return data;

      return [];
    } catch (error) {
      console.error(`리뷰 로딩 실패 (시도 ${attempt + 1}):`, error);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return [];
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function stripHtmlTags(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function truncateContent(content: string, maxLength: number = 100): string {
  if (!content) return "";
  const plainText = stripHtmlTags(content);
  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength) + "...";
}

function ReviewCard({ review }: { review: PublishedReview }) {
  const previewImage = review.media?.find(m => m.type === 'image')?.url;

  return (
    <article className="group cursor-pointer flex flex-col h-full">
      <Link href={`/review/${review.id}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-slate-50 mb-6 group-hover:shadow-2xl transition-shadow duration-1000">
          {previewImage ? (
            <img
              src={previewImage}
              alt={review.productName || ""}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-200 bg-slate-50">
              <span className="text-[10px] tracking-[0.2em] font-bold uppercase">No Image Preview</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
        </div>
      </Link>

      <div className="flex flex-col flex-grow">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-bold tracking-widest text-amber-700/80 uppercase">
            {review.category || "큐레이션"}
          </span>
          <span className="w-4 h-[1px] bg-slate-200" />
          <span className="text-xs font-medium tracking-tight text-slate-400">
            {formatDate(review.createdAt || "")}
          </span>
        </div>

        <Link href={`/review/${review.id}`} className="block mb-4">
          <h3 className="text-xl md:text-2xl font-serif font-bold text-slate-900 leading-tight hover:text-amber-800 transition-colors line-clamp-2 h-[3.5rem] md:h-[4rem]">
            {review.productName}
          </h3>
        </Link>

        <p className="text-slate-500 line-clamp-2 text-base leading-relaxed font-serif italic opacity-80 mb-8 min-h-[3rem]">
          "{truncateContent(review.content || "", 90)}"
        </p>

        <div className="mt-auto pt-4 border-t border-slate-50">
          <Link href={`/review/${review.id}`} className="text-xs font-bold tracking-widest uppercase border-b border-amber-200 pb-1 hover:border-slate-900 transition-all">
            Read More
          </Link>
        </div>
      </div>
    </article>
  );
}

const categories = [
  { name: "전체", slug: "all" },
  { name: "라이프스타일", slug: "lifestyle" },
  { name: "디지털/가전", slug: "digital" },
  { name: "주방/쿠킹", slug: "kitchen" },
  { name: "패션/뷰티", slug: "fashion" },
];

export default function HomePage() {
  const [allReviews, setAllReviews] = useState<PublishedReview[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<PublishedReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    fetchPublishedReviews(100).then(data => {
      setAllReviews(data);
      setFilteredReviews(data);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activeCategory === "all") {
      setFilteredReviews(allReviews);
    } else {
      setFilteredReviews(allReviews.filter(r => r.category === activeCategory || r.category?.toLowerCase() === activeCategory));
    }
  }, [activeCategory, allReviews]);

  return (
    <div className="min-h-screen bg-white selection:bg-amber-50">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-50">
        <div className="mx-auto max-w-7xl px-8 lg:px-16">
          <div className="flex h-24 items-center justify-between">
            <Link href="/" className="flex items-center">
              <img src="/logo.png" alt="세모링크" className="h-20 md:h-28 w-auto transition-transform hover:scale-105" />
            </Link>

            <nav className="hidden lg:flex items-center gap-14 text-sm font-bold tracking-[0.1em] text-slate-500">
              {categories.slice(1).map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCategory(cat.slug)}
                  className={`hover:text-slate-900 transition-colors relative py-1 ${activeCategory === cat.slug ? "text-slate-900 font-black" : ""}`}
                >
                  {cat.name}
                  {activeCategory === cat.slug && (
                    <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-amber-500" />
                  )}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-8">
              <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-slate-400 hover:text-slate-900 transition-colors">
                Journal Access
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 lg:pt-64 lg:pb-48 text-center bg-[#fcf9f2]/50 overflow-hidden">
        {/* Dynamic Decorative Orb - Sparkling movement - Increased Visibility */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-amber-300/30 rounded-full blur-[120px] animate-glow pointer-events-none" />
        <div className="absolute top-1/3 right-[15%] w-40 h-40 border-2 border-amber-400/30 rounded-full animate-float pointer-events-none" />
        <div className="absolute bottom-1/4 left-[10%] w-24 h-24 border-2 border-amber-500/25 rounded-full animate-float pointer-events-none" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-[5%] w-12 h-12 bg-amber-200/40 rounded-full blur-xl animate-pulse pointer-events-none" />

        <div className="mx-auto max-w-5xl px-8 relative z-10">
          <div className="flex flex-col items-center">
            <div className="w-16 h-[1px] bg-amber-300 mb-10" />
            <span className="text-[11px] font-black tracking-[0.6em] text-amber-800/60 mb-10 block uppercase">
              Archiviste de la Qualité
            </span>
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 leading-[1.2] mb-12 tracking-tight">
              세상의 모든 링크, <br />
              <span className="italic font-normal serif opacity-90">더 나은 일상을 기록하다.</span>
            </h1>
            <p className="max-w-xl text-slate-500 font-serif italic text-lg md:text-xl leading-relaxed mb-16 opacity-80">
              "우리는 단지 제품을 소개하지 않습니다. <br />
              품격 있는 삶을 위한 안목을 공유하고, <br />
              당신의 매일이 하나의 예술이 되기를 바랍니다."
            </p>
            <div className="w-[1px] h-24 bg-gradient-to-b from-amber-200 to-transparent" />
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <main className="mx-auto max-w-7xl px-8 lg:px-16 py-24">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-20">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 mb-6">취향의 발견</h2>
            <p className="text-slate-400 font-serif italic text-lg opacity-70">당신의 일상에 영감을 줄 선별된 아이템입니다.</p>
          </div>

          <div className="flex gap-10 overflow-x-auto no-scrollbar pb-4 border-b border-slate-50">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`shrink-0 text-sm font-bold tracking-widest uppercase transition-all ${activeCategory === cat.slug ? "text-amber-800 border-b-2 border-amber-800 pb-1" : "text-slate-400 hover:text-slate-600"
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-x-12 gap-y-32 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-slate-50 mb-8" />
                <div className="h-4 bg-slate-50 w-1/4 mb-6" />
                <div className="h-10 bg-slate-50 w-full mb-6" />
                <div className="h-20 bg-slate-50 w-full" />
              </div>
            ))}
          </div>
        ) : filteredReviews.length > 0 ? (
          <div className="grid gap-x-12 gap-y-32 sm:grid-cols-2 lg:grid-cols-3">
            {filteredReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="text-center py-40 border-y border-slate-50">
            <p className="text-slate-300 font-serif italic text-2xl">아직 게시된 리뷰가 없습니다.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white pt-40 pb-20 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-8 lg:px-16">
          <div className="grid gap-24 lg:grid-cols-3 mb-40">
            <div className="lg:col-span-1">
              <img src="/logo.png" alt="세모링크" className="h-16 w-auto mb-12" />
              <p className="text-slate-400 text-base font-serif italic leading-relaxed opacity-80">
                Semolink는 가치 있는 소비와 일상의 발견을 기록하는 전문 아카이브입니다.
                수많은 선택지 속에서 진정한 탁월함을 찾아내는 당신의 안목을 위해
                우리는 가장 좋은 것만을 선별하여 기록합니다.
              </p>
            </div>

            <div className="lg:col-span-2 grid gap-16 grid-cols-2 md:grid-cols-3">
              <div>
                <h4 className="text-[11px] font-black tracking-[0.4em] uppercase text-slate-900 mb-10">ARCHIVE</h4>
                <ul className="space-y-5 text-[10px] font-black tracking-[0.3em] uppercase text-slate-400">
                  {categories.slice(1).map(c => (
                    <li key={c.slug} onClick={() => setActiveCategory(c.slug)} className="hover:text-amber-800 cursor-pointer transition-colors">
                      {c.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-black tracking-[0.4em] uppercase text-slate-900 mb-10">ABOUT</h4>
                <ul className="space-y-5 text-[10px] font-black tracking-[0.3em] uppercase text-slate-400">
                  <li className="hover:text-slate-900 cursor-pointer">Curation Policy</li>
                  <li className="hover:text-slate-900 cursor-pointer">Brand Story</li>
                  <li className="hover:text-slate-900 cursor-pointer">Contact</li>
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-black tracking-[0.4em] uppercase text-slate-900 mb-10">LEGAL</h4>
                <ul className="space-y-5 text-[10px] font-black tracking-[0.3em] uppercase text-slate-400">
                  <li className="hover:text-slate-900 cursor-pointer">Privacy</li>
                  <li className="hover:text-slate-900 cursor-pointer">Terms</li>
                  <li className="hover:text-slate-900 cursor-pointer text-amber-700">Instagram</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-16 border-t border-slate-100 text-[10px] font-black tracking-[0.4em] uppercase text-slate-300">
            <p>&copy; {new Date().getFullYear()} SEMOLINK ARCHIVE. ALL RIGHTS RESERVED.</p>
            <p className="opacity-50 italic">CURATED WITH EXCELLENCE IN SEOUL</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

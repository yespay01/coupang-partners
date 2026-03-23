"use client";

import { useState } from "react";
import Link from "next/link";

interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: { name: string; amount: string }[];
  coupangProducts: { ingredientName: string; productName: string }[];
  slug: string;
  viewCount: number;
  createdAt: string;
}

const PAGE_SIZE = 12;

export function RecipesListClient({
  initialRecipes,
  initialHasMore,
}: {
  initialRecipes: Recipe[];
  initialHasMore: boolean;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/recipes?limit=${PAGE_SIZE}&offset=${recipes.length}`
      );
      const data = await res.json();
      if (data.success && data.data) {
        setRecipes((prev) => [...prev, ...(data.data.recipes || [])]);
        setHasMore(data.data.hasMore || false);
      }
    } catch (err) {
      console.error("추가 로딩 실패:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (recipes.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            아직 게시된 레시피가 없습니다
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            곧 맛있는 레시피가 올라올 예정입니다.
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
        총 {recipes.length}개의 레시피
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.slug || recipe.id}`}
          >
            <article className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg cursor-pointer">
              <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 mb-2">
                재료 {recipe.ingredients?.length || 0}개
              </span>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition line-clamp-2">
                {recipe.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                {recipe.description}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span suppressHydrationWarning>
                  {new Date(recipe.createdAt).toLocaleDateString("ko-KR")}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-amber-600 group-hover:text-amber-700 transition">
                  레시피 보기
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

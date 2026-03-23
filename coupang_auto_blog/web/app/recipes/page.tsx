import { Metadata } from "next";
import Link from "next/link";
import { RecipesListClient } from "@/components/RecipesListClient";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "요리 레시피 | 세모링크",
  description:
    "다양한 레시피와 함께 필요한 재료를 쿠팡에서 바로 구매하세요. 세모링크에서 맛있는 레시피를 확인하세요.",
  alternates: {
    canonical: "https://semolink.store/recipes",
  },
  openGraph: {
    title: "요리 레시피 | 세모링크",
    description: "다양한 레시피와 함께 필요한 재료를 쿠팡에서 바로 구매하세요.",
    type: "website",
  },
};

export const revalidate = 3600;

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

const PAGE_SIZE = 12;

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

async function fetchInitialRecipes(): Promise<{
  recipes: Recipe[];
  hasMore: boolean;
}> {
  try {
    const res = await fetch(
      `${AUTOMATION_SERVER_URL}/api/recipes?limit=${PAGE_SIZE}&offset=0`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return { recipes: [], hasMore: false };
    const data = await res.json();
    if (data.success && data.data) {
      return {
        recipes: data.data.recipes || [],
        hasMore: data.data.hasMore || false,
      };
    }
    return { recipes: [], hasMore: false };
  } catch {
    return { recipes: [], hasMore: false };
  }
}

export default async function RecipesPage() {
  const { recipes, hasMore } = await fetchInitialRecipes();

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
            <span className="text-slate-900 font-medium">요리 레시피</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            요리 레시피
          </h1>
          <p className="mt-2 text-slate-600">
            다양한 레시피와 함께 필요한 재료를 쿠팡에서 바로 구매하세요.
          </p>
        </div>
      </div>

      <RecipesListClient initialRecipes={recipes} initialHasMore={hasMore} />

      <SiteFooter />
    </div>
  );
}

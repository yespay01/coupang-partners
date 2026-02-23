import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const revalidate = 3600;
export const dynamicParams = true;

const AUTOMATION_SERVER_URL =
  process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: { name: string; amount: string }[];
  instructions: string;
  coupangProducts: {
    ingredientName: string;
    productName: string;
    productPrice: number;
    productImage: string;
    affiliateUrl: string;
  }[];
  viewCount: number;
  createdAt: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getRecipe(id: string): Promise<Recipe | null> {
  try {
    const response = await fetch(
      `${AUTOMATION_SERVER_URL}/api/recipes/id/${id}`,
      { next: { revalidate: 3600 } }
    );
    if (!response.ok) return null;
    const result = await response.json();
    if (!result.success || !result.data) return null;
    return result.data as Recipe;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) return { title: "레시피를 찾을 수 없습니다" };

  return {
    title: `${recipe.title} - 레시피`,
    description: recipe.description,
    openGraph: {
      title: recipe.title,
      description: recipe.description,
      type: "article",
    },
  };
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  return (
    <div className="min-h-screen bg-white selection:bg-amber-50">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 pt-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition">홈</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/recipes" className="hover:text-slate-700 transition">요리 레시피</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-medium line-clamp-1">{recipe.title}</span>
        </nav>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">{recipe.title}</h1>
        <p className="text-lg text-slate-600 mb-8">{recipe.description}</p>

        <div className="flex gap-4 text-sm text-slate-500 mb-8">
          <span>{new Date(recipe.createdAt).toLocaleDateString("ko-KR")}</span>
          <span>조회수 {recipe.viewCount}</span>
        </div>

        {/* Ingredients */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
            재료
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {recipe.ingredients?.map((ing, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <span className="font-medium text-slate-900">{ing.name}</span>
                <span className="text-sm text-slate-500">{ing.amount}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Coupang Products */}
        {recipe.coupangProducts && recipe.coupangProducts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
              쿠팡에서 재료 구매하기
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recipe.coupangProducts.map((product, i) => (
                <a
                  key={i}
                  href={product.affiliateUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {product.productImage && (
                    <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-slate-100">
                      <img
                        src={product.productImage}
                        alt={product.productName}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                  <div className="text-xs text-amber-600 font-medium mb-1">{product.ingredientName}</div>
                  <div className="text-sm font-medium text-slate-900 line-clamp-2 group-hover:text-blue-600 transition">
                    {product.productName}
                  </div>
                  {product.productPrice > 0 && (
                    <div className="mt-1 text-sm font-bold text-red-600">
                      {product.productPrice.toLocaleString()}원
                    </div>
                  )}
                  <div className="mt-2 text-xs text-blue-500 font-medium">
                    쿠팡에서 보기 &rarr;
                  </div>
                </a>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
            </p>
          </section>
        )}

        {/* Instructions */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
            조리법
          </h2>
          <div className="prose prose-slate max-w-none">
            {recipe.instructions?.split("\n").map((line, i) => (
              <p key={i} className="text-slate-700 leading-relaxed mb-3">
                {line}
              </p>
            ))}
          </div>
        </section>

        {/* Back */}
        <div className="border-t border-slate-200 pt-8">
          <Link
            href="/recipes"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            레시피 목록으로
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

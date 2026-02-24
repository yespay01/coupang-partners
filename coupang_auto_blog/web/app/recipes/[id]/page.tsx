import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
  cookingTime?: string;
  difficulty?: string;
  ingredients: { name: string; amount: string }[];
  instructions: string;
  coupangProducts: {
    ingredientName: string;
    productName: string;
    productPrice: number;
    productImage: string;
    affiliateUrl: string;
  }[];
  imageUrl?: string;
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

  const keywords = [
    recipe.title,
    "레시피",
    "요리",
    ...(recipe.ingredients?.map((i: { name: string }) => i.name) || []),
  ].filter(Boolean);

  const description = recipe.description
    ? recipe.description.slice(0, 160)
    : `${recipe.title} 레시피. 재료와 조리법을 확인하세요.`;

  return {
    title: `${recipe.title} - 레시피`,
    description,
    keywords,
    alternates: {
      canonical: `https://semolink.store/recipes/${id}`,
    },
    openGraph: {
      title: `${recipe.title} - 레시피`,
      description,
      type: "article",
      ...(recipe.imageUrl ? { images: [{ url: recipe.imageUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${recipe.title} - 레시피`,
      description,
      ...(recipe.imageUrl ? { images: [recipe.imageUrl] } : {}),
    },
  };
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const description = recipe.description
    ? recipe.description.slice(0, 160)
    : `${recipe.title} 레시피. 재료와 조리법을 확인하세요.`;

  const recipeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description,
    image: recipe.imageUrl,
    datePublished: recipe.createdAt,
    author: {
      "@type": "Organization",
      name: "세모링크",
      url: "https://semolink.store",
    },
    ...(recipe.cookingTime ? { totalTime: recipe.cookingTime } : {}),
    recipeIngredient: recipe.ingredients?.map(
      (i) => `${i.name} ${i.amount}`.trim()
    ),
    recipeInstructions: recipe.instructions
      ?.split("\n")
      .filter(Boolean)
      .map((step, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        text: step.trim(),
      })),
  };

  return (
    <div className="min-h-screen bg-white selection:bg-amber-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd) }}
      />

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

        <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-8">
          {recipe.cookingTime && (
            <span className="inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {recipe.cookingTime}
            </span>
          )}
          {recipe.difficulty && (
            <span className="inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              {recipe.difficulty}
            </span>
          )}
          <time dateTime={new Date(recipe.createdAt).toISOString()}>
            {new Date(recipe.createdAt).toLocaleDateString("ko-KR")}
          </time>
          <span>조회수 {recipe.viewCount}</span>
        </div>

        {/* Hero Image */}
        {recipe.imageUrl && (
          <div className="mb-10 overflow-hidden rounded-xl relative w-full" style={{ aspectRatio: "16/9", maxHeight: "480px" }}>
            <Image
              src={recipe.imageUrl}
              alt={`${recipe.title} 요리 완성 이미지`}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 896px"
            />
          </div>
        )}

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

        {/* Coupang Products (last) */}
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
                    <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-slate-100 relative">
                      <Image
                        src={product.productImage}
                        alt={`${product.ingredientName} - ${product.productName}`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
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

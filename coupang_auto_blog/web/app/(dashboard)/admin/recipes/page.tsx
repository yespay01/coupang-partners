"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";

interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: { name: string; amount: string }[];
  instructions: string;
  coupangProducts: { ingredientName: string; productName: string; productPrice: number }[];
  imageUrl: string | null;
  slug: string;
  status: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dishName, setDishName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchRecipes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        success: boolean;
        data: { recipes: Recipe[]; totalCount: number };
      }>("/api/admin/recipes?limit=50");

      if (data.success && data.data) {
        setRecipes(data.data.recipes);
      }
    } catch (err) {
      console.error("레시피 목록 로딩 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleGenerate = async () => {
    if (!dishName.trim() || isGenerating) return;

    setIsGenerating(true);
    setMessage(null);
    try {
      const data = await apiClient.post<{
        success: boolean;
        message: string;
        data?: { recipeId: number; title: string; ingredientCount: number; coupangProductCount: number };
      }>("/api/admin/recipes/generate", { dishName: dishName.trim() });

      if (data.success) {
        setMessage({
          type: "success",
          text: `"${data.data?.title}" 레시피 생성 완료! (재료 ${data.data?.ingredientCount}개, 쿠팡 상품 ${data.data?.coupangProductCount}개)`,
        });
        setDishName("");
        fetchRecipes();
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
      const data = await apiClient.put<{ success: boolean }>(`/api/admin/recipes/${id}`, {
        status: "published",
      });
      if (data.success) {
        fetchRecipes();
        setMessage({ type: "success", text: "레시피가 발행되었습니다." });
      }
    } catch (err) {
      console.error("발행 실패:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await apiClient.delete(`/api/admin/recipes/${id}`);
      fetchRecipes();
      setMessage({ type: "success", text: "레시피가 삭제되었습니다." });
    } catch (err) {
      console.error("삭제 실패:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">요리 레시피 관리</h1>
          <p className="mt-1 text-sm text-slate-500">
            요리명을 입력하면 AI가 레시피를 생성하고 쿠팡에서 재료를 검색합니다.
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
          <h2 className="mb-4 text-lg font-semibold text-slate-900">새 레시피 생성</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="요리명을 입력하세요 (예: 김치찌개, 파스타, 된장국)"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isGenerating}
            />
            <button
              onClick={handleGenerate}
              disabled={!dishName.trim() || isGenerating}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  생성 중...
                </span>
              ) : (
                "AI 레시피 생성"
              )}
            </button>
          </div>
        </div>

        {/* 레시피 목록 */}
        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
            <p className="mt-4 text-sm text-slate-600">레시피 목록을 불러오는 중...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-500">아직 생성된 레시피가 없습니다.</p>
            <p className="mt-1 text-sm text-slate-400">위에서 요리명을 입력하여 첫 레시피를 생성해보세요.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-slate-500">총 {recipes.length}개의 레시피</div>
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{recipe.title}</h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          recipe.status === "published"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {recipe.status === "published" ? "발행됨" : "초안"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{recipe.description}</p>
                    <div className="mt-2 flex gap-4 text-xs text-slate-500">
                      <span>재료 {recipe.ingredients?.length || 0}개</span>
                      <span>쿠팡 상품 {recipe.coupangProducts?.length || 0}개</span>
                      <span>조회수 {recipe.viewCount}</span>
                      <span>{new Date(recipe.createdAt).toLocaleDateString("ko-KR")}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {recipe.status === "draft" && (
                      <button
                        onClick={() => handlePublish(recipe.id)}
                        className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-50"
                      >
                        발행
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(recipe.id)}
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

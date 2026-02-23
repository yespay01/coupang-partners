"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";

interface CoupangProduct {
  ingredientName: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  productUrl?: string;
  affiliateUrl?: string;
}

interface Ingredient {
  name: string;
  amount: string;
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  cookingTime: string;
  difficulty: string;
  ingredients: Ingredient[];
  instructions: string;
  coupangProducts: CoupangProduct[];
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
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleUnpublish = async (id: string) => {
    try {
      const data = await apiClient.put<{ success: boolean }>(`/api/admin/recipes/${id}`, {
        status: "draft",
      });
      if (data.success) {
        fetchRecipes();
        setMessage({ type: "success", text: "레시피가 초안으로 변경되었습니다." });
      }
    } catch (err) {
      console.error("초안 변경 실패:", err);
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

  const handleEdit = async (recipe: Recipe) => {
    // 상세 데이터 로드
    try {
      const data = await apiClient.get<{ success: boolean; data: Recipe }>(
        `/api/admin/recipes/${recipe.id}`
      );
      if (data.success && data.data) {
        setEditingRecipe(data.data);
      } else {
        setEditingRecipe(recipe);
      }
    } catch {
      setEditingRecipe(recipe);
    }
  };

  const handleSave = async () => {
    if (!editingRecipe || isSaving) return;

    setIsSaving(true);
    try {
      const data = await apiClient.put<{ success: boolean }>(`/api/admin/recipes/${editingRecipe.id}`, {
        title: editingRecipe.title,
        description: editingRecipe.description,
        cookingTime: editingRecipe.cookingTime,
        difficulty: editingRecipe.difficulty,
        instructions: editingRecipe.instructions,
        ingredients: editingRecipe.ingredients,
        imageUrl: editingRecipe.imageUrl,
        coupangProducts: editingRecipe.coupangProducts,
      });

      if (data.success) {
        setMessage({ type: "success", text: "레시피가 수정되었습니다." });
        setEditingRecipe(null);
        fetchRecipes();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "수정 중 오류 발생";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    if (!editingRecipe) return;
    const updated = [...editingRecipe.ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setEditingRecipe({ ...editingRecipe, ingredients: updated });
  };

  const removeIngredient = (index: number) => {
    if (!editingRecipe) return;
    const updated = editingRecipe.ingredients.filter((_, i) => i !== index);
    setEditingRecipe({ ...editingRecipe, ingredients: updated });
  };

  const addIngredient = () => {
    if (!editingRecipe) return;
    setEditingRecipe({
      ...editingRecipe,
      ingredients: [...editingRecipe.ingredients, { name: "", amount: "" }],
    });
  };

  // 수정 화면
  if (editingRecipe) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">레시피 수정</h1>
              <p className="mt-1 text-sm text-slate-500">레시피 내용을 수정한 후 저장하세요.</p>
            </div>
            <button
              onClick={() => setEditingRecipe(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              목록으로
            </button>
          </div>

          {/* 대표 이미지 */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-slate-700">대표 이미지</label>
            <div className="flex gap-4">
              {editingRecipe.imageUrl && (
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <img
                    src={editingRecipe.imageUrl}
                    alt={editingRecipe.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="text"
                  value={editingRecipe.imageUrl || ""}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, imageUrl: e.target.value || null })}
                  placeholder="이미지 URL을 입력하세요 (비워두면 이미지 없음)"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  자동 검색된 이미지가 맞지 않으면 직접 URL을 변경하세요.
                </p>
              </div>
            </div>
          </div>

          {/* 제목 */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-slate-700">제목</label>
            <input
              type="text"
              value={editingRecipe.title}
              onChange={(e) => setEditingRecipe({ ...editingRecipe, title: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 조리시간 / 난이도 */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">조리시간</label>
                <input
                  type="text"
                  value={editingRecipe.cookingTime || ""}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, cookingTime: e.target.value })}
                  placeholder="예: 30분, 1시간"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">난이도</label>
                <select
                  value={editingRecipe.difficulty || ""}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, difficulty: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">선택</option>
                  <option value="쉬움">쉬움</option>
                  <option value="보통">보통</option>
                  <option value="어려움">어려움</option>
                </select>
              </div>
            </div>
          </div>

          {/* 설명 */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-slate-700">설명</label>
            <textarea
              value={editingRecipe.description}
              onChange={(e) => setEditingRecipe({ ...editingRecipe, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 재료 */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                재료 ({editingRecipe.ingredients?.length || 0}개)
              </label>
              <button
                onClick={addIngredient}
                className="rounded-lg border border-blue-300 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
              >
                + 재료 추가
              </button>
            </div>
            <div className="space-y-2">
              {editingRecipe.ingredients?.map((ing, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(i, "name", e.target.value)}
                    placeholder="재료명"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(i, "amount", e.target.value)}
                    placeholder="양"
                    className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={() => removeIngredient(i)}
                    className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"
                    title="삭제"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 조리법 */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-slate-700">조리법</label>
            <textarea
              value={editingRecipe.instructions}
              onChange={(e) => setEditingRecipe({ ...editingRecipe, instructions: e.target.value })}
              rows={12}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 쿠팡 상품 */}
          {editingRecipe.coupangProducts && editingRecipe.coupangProducts.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <label className="mb-4 block text-sm font-semibold text-slate-700">
                연결된 쿠팡 상품 ({editingRecipe.coupangProducts.length}개)
              </label>
              <div className="space-y-2">
                {editingRecipe.coupangProducts.map((product, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
                  >
                    <div className="flex-1">
                      <span className="mr-2 text-xs font-medium text-amber-600">{product.ingredientName}</span>
                      <span className="text-slate-700">{product.productName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {product.productPrice > 0 && (
                        <span className="text-xs font-medium text-red-600">
                          {product.productPrice.toLocaleString()}원
                        </span>
                      )}
                      {(product.affiliateUrl || product.productUrl) && (
                        <a
                          href={product.affiliateUrl || product.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          링크 확인
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 저장 버튼 */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setEditingRecipe(null)}
              className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 목록 화면
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
                  <div className="flex flex-1 gap-4">
                    {recipe.imageUrl && (
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
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
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                        {recipe.cookingTime && <span>{recipe.cookingTime}</span>}
                        {recipe.difficulty && <span>{recipe.difficulty}</span>}
                        <span>재료 {recipe.ingredients?.length || 0}개</span>
                        <span>쿠팡 상품 {recipe.coupangProducts?.length || 0}개</span>
                        <span>조회수 {recipe.viewCount}</span>
                        <span>{new Date(recipe.createdAt).toLocaleDateString("ko-KR")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(recipe)}
                      className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
                    >
                      수정
                    </button>
                    {recipe.status === "draft" ? (
                      <button
                        onClick={() => handlePublish(recipe.id)}
                        className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-50"
                      >
                        발행
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnpublish(recipe.id)}
                        className="rounded-lg border border-yellow-300 px-3 py-1.5 text-xs font-medium text-yellow-700 transition hover:bg-yellow-50"
                      >
                        초안으로
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

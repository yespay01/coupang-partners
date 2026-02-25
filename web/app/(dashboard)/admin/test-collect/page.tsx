"use client";

import { useState } from "react";

type CollectionResult = {
  source: string;
  success: boolean;
  count: number;
  products?: any[];
  error?: string;
};

export default function TestCollectPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CollectionResult[]>([]);
  const [collectLoading, setCollectLoading] = useState(false);
  const [collectResult, setCollectResult] = useState<any>(null);

  // 실제 상품 수집 (Firestore에 저장)
  const collectProducts = async () => {
    setCollectLoading(true);
    setCollectResult(null);
    try {
      const response = await fetch("/api/admin/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxProducts: 10 }),
      });
      const data = await response.json();

      setCollectResult(data);
    } catch (error) {
      console.error("상품 수집 실패:", error);
      setCollectResult({
        success: false,
        message: error instanceof Error ? error.message : "수집 중 오류 발생",
      });
    }
    setCollectLoading(false);
  };

  // 골드박스 수집 테스트
  const testGoldbox = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/coupang/test-collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "goldbox", limit: 5 }),
      });
      const data = await response.json();

      setResults((prev) => [
        ...prev,
        {
          source: "goldbox",
          success: data.success,
          count: data.products?.length || 0,
          products: data.products,
          error: data.message,
        },
      ]);
    } catch (error) {
      console.error("골드박스 테스트 실패:", error);
    }
    setLoading(false);
  };

  // 쿠팡 PL 수집 테스트
  const testCoupangPL = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/coupang/test-collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "coupangPL", brandId: "1001", limit: 5 }),
      });
      const data = await response.json();

      setResults((prev) => [
        ...prev,
        {
          source: "coupangPL (탐사)",
          success: data.success,
          count: data.products?.length || 0,
          products: data.products,
          error: data.message,
        },
      ]);
    } catch (error) {
      console.error("쿠팡 PL 테스트 실패:", error);
    }
    setLoading(false);
  };

  // 카테고리 베스트 수집 테스트
  const testCategory = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/coupang/test-collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "category", categoryId: "1001", limit: 5 }),
      });
      const data = await response.json();

      setResults((prev) => [
        ...prev,
        {
          source: "카테고리 베스트 (여성패션)",
          success: data.success,
          count: data.products?.length || 0,
          products: data.products,
          error: data.message,
        },
      ]);
    } catch (error) {
      console.error("카테고리 테스트 실패:", error);
    }
    setLoading(false);
  };

  // 키워드 검색 테스트
  const testKeyword = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/coupang/test-collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "keyword", keyword: "노트북", limit: 5 }),
      });
      const data = await response.json();

      setResults((prev) => [
        ...prev,
        {
          source: "키워드 검색 (노트북)",
          success: data.success,
          count: data.products?.length || 0,
          products: data.products,
          error: data.message,
        },
      ]);
    } catch (error) {
      console.error("키워드 테스트 실패:", error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">상품 수집</h1>
          <p className="mt-1 text-sm text-slate-500">
            실제 수집 실행과 API 수집 점검을 한 화면에서 관리합니다.
          </p>
        </div>

        {/* 실제 상품 수집 버튼 */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900">실제 상품 수집 (DB 저장)</h2>
          <p className="mt-1 text-sm text-red-700">
            시스템 설정에 따라 상품을 수집하고 DB에 저장합니다. 저장된 상품은 자동 리뷰 생성 대상이 됩니다.
          </p>
          <button
            onClick={collectProducts}
            disabled={collectLoading}
            className="mt-4 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {collectLoading ? "수집 중..." : "상품 수집 시작"}
          </button>

          {/* 수집 결과 */}
          {collectResult && (
            <div
              className={`mt-4 rounded-lg border p-4 ${
                collectResult.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-100"
              }`}
            >
              <h3 className="text-sm font-semibold">
                {collectResult.success ? "수집 성공" : "수집 실패"}
              </h3>
              <p className="mt-2 text-sm">{collectResult.message}</p>
              {collectResult.data && (
                <div className="mt-3 space-y-1 text-sm">
                  <div>총 수집: {collectResult.data.totalCollected}개</div>
                  <div className="ml-4 space-y-1 text-xs text-slate-700">
                    <div>골드박스: {collectResult.data.stats.goldbox}개</div>
                    <div>카테고리: {collectResult.data.stats.categories}개</div>
                    <div>키워드: {collectResult.data.stats.keywords}개</div>
                    <div>쿠팡 PL: {collectResult.data.stats.coupangPL}개</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">API 테스트 (저장 안 함)</h2>
            <p className="mt-1 text-sm text-slate-500">
              API 연결만 테스트하며 DB에는 저장하지 않습니다.
            </p>
          </div>

          {/* 테스트 버튼 */}
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <button
              onClick={testGoldbox}
              disabled={loading}
              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              골드박스 테스트
            </button>
            <button
              onClick={testCoupangPL}
              disabled={loading}
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              쿠팡 PL 테스트
            </button>
            <button
              onClick={testCategory}
              disabled={loading}
              className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
            >
              카테고리 테스트
            </button>
            <button
              onClick={testKeyword}
              disabled={loading}
              className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
            >
              키워드 테스트
            </button>
          </div>
        </div>

        {/* 테스트 결과 */}
        <div className="space-y-4">
          {results.map((result, index) => (
            <div
              key={index}
              className={`rounded-lg border p-4 ${
                result.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  {result.success ? "성공" : "실패"} · {result.source}
                </h3>
                <span className="text-sm font-medium text-slate-700">
                  {result.count}개 수집
                </span>
              </div>
              {result.error && (
                <p className="mt-2 text-sm text-red-700">{result.error}</p>
              )}
              {result.products && result.products.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-slate-700">수집된 상품</p>
                  {result.products.map((product, i) => (
                    <div key={i} className="text-xs text-slate-600">
                      • {product.productName} ({product.productPrice?.toLocaleString()}원)
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

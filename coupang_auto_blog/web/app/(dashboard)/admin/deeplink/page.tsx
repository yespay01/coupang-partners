"use client";

import { useState } from "react";
import { apiClient } from "@/lib/apiClient";

interface DeeplinkResult {
  originalUrl: string;
  shortenUrl: string;
}

export default function AdminDeeplinkPage() {
  const [urlInput, setUrlInput] = useState("");
  const [results, setResults] = useState<DeeplinkResult[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleConvert = async () => {
    const urls = urlInput
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      setMessage({ type: "error", text: "URL을 입력해주세요." });
      return;
    }

    if (urls.length > 20) {
      setMessage({
        type: "error",
        text: "한 번에 최대 20개 URL만 변환할 수 있습니다.",
      });
      return;
    }

    setIsConverting(true);
    setMessage(null);
    setResults([]);

    try {
      const data = await apiClient.post<{
        success: boolean;
        message?: string;
        data?: { deeplinks: DeeplinkResult[] };
      }>("/api/admin/deeplink", { urls });

      if (data.success && data.data) {
        setResults(data.data.deeplinks);
        setMessage({
          type: "success",
          text: `${data.data.deeplinks.length}개 URL 변환 완료`,
        });
      } else {
        setMessage({
          type: "error",
          text: data.message || "변환 실패",
        });
      }
    } catch (err) {
      console.error("딥링크 변환 오류:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "변환 중 오류가 발생했습니다.",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleCopyAll = async () => {
    const allLinks = results
      .filter((r) => r.shortenUrl)
      .map((r) => r.shortenUrl)
      .join("\n");
    if (!allLinks) return;
    try {
      await navigator.clipboard.writeText(allLinks);
      setMessage({ type: "success", text: "모든 딥링크가 복사되었습니다." });
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">딥링크 변환 도구</h1>
        <p className="mt-1 text-sm text-slate-500">
          일반 쿠팡 URL을 제휴 딥링크(단축 URL)로 변환합니다.
        </p>
      </div>

      {/* 안내 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-medium">사용법</p>
        <ul className="mt-1 list-inside list-disc space-y-1 text-blue-700">
          <li>
            쿠팡 상품 URL을 한 줄에 하나씩 입력하세요 (최대 20개)
          </li>
          <li>
            제휴 파라미터가 없는 순수 URL을 입력해야 합니다
            <br />
            <span className="text-xs text-blue-500">
              예: https://www.coupang.com/vp/products/123456
            </span>
          </li>
          <li>
            이미 제휴 파라미터가 포함된 URL은 변환되지 않을 수 있습니다
          </li>
        </ul>
      </div>

      {/* 입력 영역 */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          쿠팡 URL 입력 (줄바꿈으로 구분)
        </label>
        <textarea
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder={`https://www.coupang.com/vp/products/123456\nhttps://www.coupang.com/vp/products/789012`}
          rows={6}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {urlInput
              .split("\n")
              .filter((u) => u.trim()).length}
            개 URL
          </span>
          <button
            onClick={handleConvert}
            disabled={isConverting}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConverting ? "변환 중..." : "변환"}
          </button>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 결과 테이블 */}
      {results.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              변환 결과 ({results.length}개)
            </h2>
            <button
              onClick={handleCopyAll}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              전체 복사
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {results.map((result, index) => (
              <div key={index} className="px-4 py-3">
                <div className="mb-1 text-xs text-slate-400 truncate">
                  {result.originalUrl}
                </div>
                {result.shortenUrl ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={result.shortenUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate text-sm font-medium text-blue-600 hover:underline"
                    >
                      {result.shortenUrl}
                    </a>
                    <button
                      onClick={() => handleCopy(result.shortenUrl, index)}
                      className="flex-shrink-0 rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {copiedIndex === index ? "복사됨" : "복사"}
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-red-500">변환 실패</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

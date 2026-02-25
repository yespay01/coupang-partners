"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  useReview,
  useCreateReview,
  useUpdateReview,
} from "@/hooks/useReviews";
import type { Review, ReviewInput, MediaItem, ReviewStatus } from "@/types";
import {
  uploadFile,
  deleteFile,
  isAllowedFileType,
  isFileSizeAllowed,
  formatFileSize,
  type UploadResult,
} from "@/lib/storage";
import { WysiwygEditor } from "./WysiwygEditor";

type ReviewEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reviewId?: string | null; // null이면 새 리뷰 생성
  onSaved?: () => void; // 하위 호환성 유지 (React Query가 자동으로 처리하므로 선택적)
};

const categories = [
  { value: "", label: "카테고리 선택" },
  { value: "lifestyle", label: "라이프스타일" },
  { value: "digital", label: "디지털/가전" },
  { value: "kitchen", label: "주방/쿠킹" },
  { value: "fashion", label: "패션/뷰티" },
  { value: "food", label: "식품" },
  { value: "baby", label: "유아/아동" },
  { value: "sports", label: "스포츠/레저" },
  { value: "etc", label: "기타" },
];

const statusOptions: { value: ReviewStatus; label: string }[] = [
  { value: "draft", label: "초안" },
  { value: "needs_revision", label: "재검수 필요" },
  { value: "approved", label: "승인 완료" },
  { value: "published", label: "게시 완료" },
];

export function ReviewEditorModal({
  isOpen,
  onClose,
  reviewId,
  onSaved,
}: ReviewEditorModalProps) {
  const [productName, setProductName] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [status, setStatus] = useState<ReviewStatus>("draft");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0); // 에디터 재마운트용 키

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = Boolean(reviewId);

  // React Query hooks
  const { data: reviewData, isLoading, error: loadError } = useReview(isOpen ? reviewId : null);
  const createMutation = useCreateReview();
  const updateMutation = useUpdateReview();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // 리뷰 데이터가 로드되면 폼 상태 업데이트
  useEffect(() => {
    if (!isOpen) return;

    if (!reviewId) {
      // 새 리뷰 모드: 초기화
      setProductName("");
      setContent("");
      setCategory("");
      setAffiliateUrl("");
      setStatus("draft");
      setMedia([]);
      setEditorKey((k) => k + 1);
      return;
    }

    if (reviewData) {
      setProductName(reviewData.productName ?? "");
      setContent(reviewData.content ?? "");
      setCategory(reviewData.category ?? "");
      setAffiliateUrl(reviewData.affiliateUrl ?? "");
      setStatus(reviewData.status ?? "draft");
      setMedia(reviewData.media ?? []);
      setEditorKey((k) => k + 1);
    }
  }, [isOpen, reviewId, reviewData]);

  // 로드 에러 처리
  useEffect(() => {
    if (loadError) {
      setError("리뷰를 불러오는 중 오류가 발생했습니다.");
    }
  }, [loadError]);

  // 파일 업로드 처리
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    const uploadedMedia: MediaItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`업로드 중... (${i + 1}/${files.length})`);

      if (!isAllowedFileType(file)) {
        setError(`지원하지 않는 파일 형식입니다: ${file.name}`);
        continue;
      }

      if (!isFileSizeAllowed(file, 50)) {
        setError(`파일 크기가 50MB를 초과합니다: ${file.name}`);
        continue;
      }

      try {
        const result: UploadResult = await uploadFile(file, "reviews");
        const mediaItem: MediaItem = {
          url: result.url,
          path: result.path,
          name: result.name,
          type: file.type.startsWith("video/") ? "video" : "image",
          size: result.size,
        };
        uploadedMedia.push(mediaItem);

        // 에디터에 이미지 자동 삽입
        if (mediaItem.type === "image" && typeof window !== "undefined") {
          const insertFn = (window as typeof window & { insertEditorImage?: (url: string) => void }).insertEditorImage;
          if (insertFn) {
            insertFn(result.url);
          }
        }
      } catch (err) {
        console.error("파일 업로드 실패:", err);
        setError(`파일 업로드 실패: ${file.name}`);
      }
    }

    if (uploadedMedia.length > 0) {
      setMedia((prev) => [...prev, ...uploadedMedia]);
    }

    setIsUploading(false);
    setUploadProgress(null);

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // 미디어 삭제
  const handleRemoveMedia = useCallback(async (index: number) => {
    const item = media[index];
    if (!item) return;

    try {
      await deleteFile(item.path);
    } catch (err) {
      console.warn("Storage 파일 삭제 실패:", err);
      // 삭제 실패해도 목록에서는 제거
    }

    setMedia((prev) => prev.filter((_, i) => i !== index));
  }, [media]);

  // 본문에 미디어 삽입 (WYSIWYG 에디터용)
  const insertMediaToContent = useCallback((item: MediaItem) => {
    if (typeof window !== "undefined") {
      const insertFn = (window as typeof window & { insertEditorImage?: (url: string) => void }).insertEditorImage;
      if (insertFn && item.type === "image") {
        insertFn(item.url);
      }
    }
  }, []);

  // 저장 - React Query mutations 사용
  const handleSave = useCallback(async () => {
    if (!productName.trim()) {
      setError("상품명을 입력해주세요.");
      return;
    }
    if (!content.trim() || content === "<p></p>") {
      setError("리뷰 내용을 입력해주세요.");
      return;
    }

    setError(null);

    const input: ReviewInput = {
      productName: productName.trim(),
      content: content.trim(),
      category,
      affiliateUrl: affiliateUrl.trim(),
      status,
      media,
    };

    try {
      if (reviewId) {
        await updateMutation.mutateAsync({ reviewId, input });
      } else {
        await createMutation.mutateAsync(input);
      }

      // React Query가 자동으로 캐시를 무효화하므로 onSaved는 선택적
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("저장 실패:", err);
      setError("저장 중 오류가 발생했습니다.");
    }
  }, [productName, content, category, affiliateUrl, status, media, reviewId, createMutation, updateMutation, onSaved, onClose]);

  // 드래그 앤 드롭
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // 이미지 업로드 버튼 클릭 핸들러
  const handleImageUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {isEditMode ? "리뷰 수정" : "새 리뷰 작성"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {/* 상품명 */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  상품명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="상품 이름을 입력하세요"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {/* 카테고리 & 상태 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    카테고리
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    상태
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ReviewStatus)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 제휴 링크 */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  쿠팡 파트너스 링크
                </label>
                <input
                  type="url"
                  value={affiliateUrl}
                  onChange={(e) => setAffiliateUrl(e.target.value)}
                  placeholder="https://link.coupang.com/..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {/* 숨겨진 파일 입력 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />

              {/* 리뷰 본문 - WYSIWYG 에디터 */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  리뷰 내용 <span className="text-rose-500">*</span>
                </label>
                <WysiwygEditor
                  key={editorKey}
                  content={content}
                  onChange={setContent}
                  placeholder="상품에 대한 리뷰를 작성하세요..."
                  onImageUpload={handleImageUploadClick}
                />
                <p className="mt-2 text-xs text-slate-500">
                  글자 수: {content.replace(/<[^>]*>/g, "").length}자 | 툴바에서 제목, 굵게, 이미지, 링크 등을 추가할 수 있습니다
                </p>
              </div>

              {/* 업로드 진행 상태 */}
              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600" />
                  {uploadProgress}
                </div>
              )}

              {/* 업로드된 미디어 목록 */}
              {media.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    업로드된 미디어 ({media.length}개)
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50"
                  >
                    {media.map((item, index) => (
                      <div
                        key={item.path}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white"
                      >
                        {item.type === "image" ? (
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-24 object-cover"
                          />
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center bg-slate-100">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => insertMediaToContent(item)}
                            className="p-1.5 rounded-full bg-white text-slate-700 hover:bg-slate-100"
                            title="본문에 삽입"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(index)}
                            className="p-1.5 rounded-full bg-white text-rose-600 hover:bg-rose-50"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <p className="px-2 py-1 text-xs text-slate-500 truncate">
                          {item.name} ({formatFileSize(item.size)})
                        </p>
                      </div>
                    ))}
                    {/* 추가 업로드 버튼 */}
                    <label className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-slate-200 bg-white cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={(e) => handleFileUpload(e.target.files)}
                        className="hidden"
                      />
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="mt-1 text-xs text-slate-400">추가</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-white transition"
          >
            취소
          </button>
          <div className="flex items-center gap-3">
            {isEditMode && (
              <span className="text-xs text-slate-500">
                수정 중인 리뷰: {reviewId?.slice(0, 8)}...
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isUploading}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "저장 중..." : isEditMode ? "수정 완료" : "리뷰 등록"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

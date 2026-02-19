/**
 * Firebase Firestore 대체 모듈
 * automation-server API를 통해 데이터를 가져옵니다.
 */

import { apiClient } from "./apiClient";

// ==================== Types ====================

export type ReviewDoc = {
  id?: string;
  productId?: string;
  productName?: string;
  author?: string;
  status?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  toneScore?: number;
  charCount?: number;
  category?: string;
  affiliateUrl?: string;
  media?: Array<{ type: string; url: string; name: string }>;
  slug?: string;
};

export type ReviewInput = Partial<
  Pick<
    ReviewDoc,
    "productId" | "productName" | "content" | "status" | "author" | "category"
  >
>;

// ==================== Utility ====================

/**
 * Firestore Timestamp 또는 ISO 문자열을 ISO 문자열로 정규화
 */
export function normalizeTimestamp(
  value: unknown
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const v = value as { seconds?: number; _seconds?: number; toDate?: () => Date };
    if (typeof v.toDate === "function") return v.toDate().toISOString();
    const seconds = v.seconds ?? v._seconds;
    if (typeof seconds === "number") return new Date(seconds * 1000).toISOString();
  }
  return String(value);
}

// ==================== Firestore DB stub ====================

/**
 * getDb - Firebase 호환 stub
 * 실제로는 사용되지 않지만 import 에러를 방지합니다.
 */
export async function getDb(): Promise<never> {
  throw new Error(
    "Firebase Firestore는 더 이상 사용되지 않습니다. API를 통해 데이터에 접근하세요."
  );
}

// ==================== Review CRUD ====================

export async function getReviewById(
  reviewId: string
): Promise<ReviewDoc | null> {
  try {
    const data = await apiClient.get<{ success: boolean; data: ReviewDoc }>(
      `/api/admin/reviews/${reviewId}`
    );
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchReviewPage(options: {
  limit?: number;
  statuses?: string[];
  updatedAfter?: Date | null;
}): Promise<{
  documents: (ReviewDoc & { id: string })[];
  hasMore: boolean;
  totalCount: number;
}> {
  try {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", String(options.limit));
    if (options.statuses?.length)
      params.set("statuses", options.statuses.join(","));
    if (options.updatedAfter)
      params.set("updatedAfter", options.updatedAfter.toISOString());

    const data = await apiClient.get<{
      success: boolean;
      data: (ReviewDoc & { id: string })[];
      total?: number;
    }>(`/api/admin/reviews?${params.toString()}`);

    const docs = data.data ?? [];
    return {
      documents: docs,
      hasMore: docs.length === (options.limit ?? 12),
      totalCount: data.total ?? docs.length,
    };
  } catch {
    return { documents: [], hasMore: false, totalCount: 0 };
  }
}

export async function createReview(input: ReviewInput): Promise<string> {
  const data = await apiClient.post<{ success: boolean; data: { reviewId: string } }>(
    "/api/review/generate",
    { productId: input.productId }
  );
  return data.data.reviewId;
}

export async function updateReview(
  reviewId: string,
  input: Partial<ReviewInput>
): Promise<void> {
  await apiClient.put(`/api/admin/reviews/${reviewId}`, input);
}

export async function updateReviewStatus(
  reviewId: string,
  status: string | undefined
): Promise<void> {
  await apiClient.put(`/api/admin/reviews/${reviewId}/status`, { status });
}

export async function deleteReview(
  reviewId: string,
  options: { resetProduct?: boolean } = {}
): Promise<void> {
  const query = options.resetProduct ? "?resetProduct=true" : "";
  await apiClient.delete(`/api/admin/reviews/${reviewId}${query}`);
}

export async function regenerateReview(
  reviewId: string,
  productId: string
): Promise<void> {
  await deleteReview(reviewId);
  await createReview({ productId });
}

// ==================== Admin Actions ====================

export async function recordAdminAction(
  _collection: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await apiClient.post("/api/admin/log", {
      level: "info",
      message: `Admin action: ${JSON.stringify(data)}`,
      context: _collection,
    });
  } catch {
    console.warn("Admin action logging failed", data);
  }
}

// ==================== Prompt Templates ====================

export async function getPromptTemplates(): Promise<unknown[]> {
  try {
    const data = await apiClient.get<{ success: boolean; data: unknown[] }>(
      "/api/admin/settings"
    );
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function getPromptTemplate(id: string): Promise<unknown | null> {
  try {
    const data = await apiClient.get<{ success: boolean; data: unknown }>(
      `/api/admin/settings/${id}`
    );
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function createPromptTemplate(
  template: Record<string, unknown>
): Promise<string> {
  const data = await apiClient.post<{
    success: boolean;
    data: { id: string };
  }>("/api/admin/settings", template);
  return data.data.id;
}

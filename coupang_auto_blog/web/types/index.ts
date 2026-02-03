/**
 * 통합 타입 정의
 * 모든 도메인 타입을 한 곳에서 관리
 */

// ==================== Review ====================

export type ReviewStatus = "draft" | "needs_revision" | "approved" | "published";

export type MediaItem = {
  url: string;
  path: string;
  name: string;
  type: "image" | "video";
  size: number;
};

/**
 * SEO 메타데이터 타입
 */
export type SEOMeta = {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
};

/**
 * Review - Firestore 문서 및 클라이언트 공통 타입
 */
export type Review = {
  id: string;
  productId?: string;
  productName?: string;
  productPrice?: number;
  productImage?: string;
  author?: string;
  status?: ReviewStatus;
  updatedAt?: string;
  createdAt?: string;
  publishedAt?: string;
  content?: string;
  toneScore?: number;
  charCount?: number;
  category?: string;
  affiliateUrl?: string;
  media?: MediaItem[];

  // 블로그 발행 관련
  slug?: string;
  seoMeta?: SEOMeta;

  // 선택 사항
  viewCount?: number;
  lastViewedAt?: string;
};

/**
 * Review 생성/수정 입력 타입
 */
export type ReviewInput = {
  productName: string;
  content: string;
  category?: string;
  affiliateUrl?: string;
  author?: string;
  status?: ReviewStatus;
  media?: MediaItem[];
};

/**
 * Review 페이지네이션 결과
 */
export type ReviewPageResult = {
  reviews: Review[];
  hasMore: boolean;
  totalCount: number;
};

// ==================== Log ====================

export type LogLevel = "info" | "warn" | "error";

/**
 * Log - 시스템 로그 타입
 */
export type Log = {
  id: string;
  level: LogLevel;
  message: string;
  type?: string;
  createdAt: string;
  context: string;
  payload?: Record<string, unknown>;
};

/**
 * Log 페이지네이션 결과
 */
export type LogPageResult = {
  logs: Log[];
  hasMore: boolean;
  totalCount: number;
};

// ==================== Product ====================

export type ProductStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Product - 수집된 상품 타입
 */
export type Product = {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  categoryId?: string;
  categoryName?: string;
  affiliateUrl: string;
  source: string; // "keyword:노트북", "category:1001", "goldbox", "coupangPL:1001"
  status: ProductStatus;
  createdAt: string;
  updatedAt?: string;
};

/**
 * Product 페이지네이션 결과
 */
export type ProductPageResult = {
  products: Product[];
  hasMore: boolean;
  totalCount: number;
};

// ==================== Earnings ====================

/**
 * Earnings - 수익 지표 타입
 */
export type Earnings = {
  id: string;
  date?: string;
  value?: string;
  commission?: number;
  trend?: string;
};

/**
 * 대시보드 표시용 지표 타입
 */
export type EarningsMetric = {
  id?: string;
  label: string;
  value: string;
  trend?: string;
};

// ==================== Filter ====================

export type DatePreset = "all" | "24h" | "7d" | "30d";

export type ReviewFilters = {
  statuses: Record<ReviewStatus, boolean>;
  dateRange: DatePreset;
  search: string;
  limit: number;
};

export type LogFilters = {
  levels: Record<LogLevel, boolean>;
  dateRange: DatePreset;
  search: string;
};

export type ProductFilters = {
  statuses: Record<ProductStatus, boolean>;
  dateRange: DatePreset;
  search: string;
  source: string;
  limit: number;
};

// ==================== Query Keys ====================

/**
 * React Query 키 상수
 */
export const queryKeys = {
  reviews: {
    all: ["reviews"] as const,
    lists: () => [...queryKeys.reviews.all, "list"] as const,
    list: (filters: Partial<ReviewFilters>) =>
      [...queryKeys.reviews.lists(), filters] as const,
    details: () => [...queryKeys.reviews.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.reviews.details(), id] as const,
  },
  logs: {
    all: ["logs"] as const,
    lists: () => [...queryKeys.logs.all, "list"] as const,
    list: (filters: Partial<LogFilters>) =>
      [...queryKeys.logs.lists(), filters] as const,
  },
  earnings: {
    all: ["earnings"] as const,
  },
  products: {
    all: ["products"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (filters: Partial<ProductFilters>) =>
      [...queryKeys.products.lists(), filters] as const,
  },
} as const;

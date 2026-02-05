/**
 * 쿠팡 API 타입 정의
 */

export interface CoupangConfig {
  accessKey: string;
  secretKey: string;
}

export interface CoupangProduct {
  productId: string | number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  categoryId?: string;
  categoryName?: string;
  [key: string]: any;
}

export interface CoupangApiResponse<T = any> {
  rCode: string;
  rMessage?: string;
  data?: T;
}

export interface DeeplinkRequest {
  coupangUrls: string[];
}

export interface DeeplinkItem {
  shortenUrl?: string;
  productUrl?: string;
  [key: string]: any;
}

export interface DeeplinkResponse {
  data?: DeeplinkItem[];
  deeplinks?: DeeplinkItem[];
  [key: string]: any;
}

export interface ProductSearchResponse {
  productData?: CoupangProduct[];
}

export interface BestCategoryResponse {
  products?: CoupangProduct[];
}

export interface GoldboxResponse {
  products?: CoupangProduct[];
}

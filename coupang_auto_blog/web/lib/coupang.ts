/**
 * Coupang API 스텁
 * automation-server API를 통해 쿠팡 데이터에 접근합니다.
 */

import { apiClient } from "./apiClient";

export type CoupangProduct = {
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  categoryName: string;
  isRocket: boolean;
  isFreeShipping: boolean;
  rating: number;
  ratingCount: number;
  rank: number;
};

export async function fetchGoldboxProducts(): Promise<CoupangProduct[]> {
  try {
    const data = await apiClient.get<{
      success: boolean;
      data: CoupangProduct[];
    }>("/api/collect/goldbox");
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function searchProducts(keyword: string): Promise<CoupangProduct[]> {
  try {
    const data = await apiClient.get<{
      success: boolean;
      data: CoupangProduct[];
    }>(`/api/collect/search?keyword=${encodeURIComponent(keyword)}`);
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function generateAffiliateLink(productUrl: string): Promise<string> {
  try {
    const data = await apiClient.post<{
      success: boolean;
      data: { shortenUrl: string };
    }>("/api/collect/affiliate-link", { productUrl });
    return data.data?.shortenUrl ?? productUrl;
  } catch {
    return productUrl;
  }
}

export function getCoupangApiConfig() {
  return {
    accessKey: process.env.COUPANG_ACCESS_KEY ?? "",
    secretKey: process.env.COUPANG_SECRET_KEY ?? "",
    partnerId: process.env.COUPANG_PARTNER_ID ?? "",
  };
}

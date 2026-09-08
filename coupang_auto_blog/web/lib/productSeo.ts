const PRODUCT_TITLE_LIMIT = 48;
const META_DESCRIPTION_LIMIT = 155;

function normalizeText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number) {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) return normalized;
  const slice = normalized.slice(0, Math.max(1, maxLength - 1));
  const lastSpace = slice.lastIndexOf(" ");
  const safeSlice = lastSpace >= Math.floor(maxLength * 0.65)
    ? slice.slice(0, lastSpace)
    : slice;
  return `${safeSlice.trim()}…`;
}

function observedPriceLabel(price: number | null) {
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  return `${Math.round(price).toLocaleString("ko-KR")}원`;
}

export function buildProductSearchMetadata(productName: string, currentPriceKrw: number | null) {
  const normalizedName = normalizeText(productName);
  const price = observedPriceLabel(currentPriceKrw);
  const titleTail = price ? ` 가격 비교 · ${price} 관측` : " 가격 비교";
  const titleName = truncateText(normalizedName, PRODUCT_TITLE_LIMIT - titleTail.length);
  const title = `${titleName}${titleTail}`;
  const description = price
    ? `${normalizedName} 최근 관측가는 ${price}입니다. 최근 90일 실제 가격 흐름과 관측 시각을 확인하고 쿠팡의 현재 판매가와 비교하세요.`
    : `${normalizedName}의 최근 90일 실제 가격 흐름과 관측 시각을 확인하고 쿠팡의 현재 판매가와 비교하세요.`;

  return {
    normalizedName,
    title,
    description: truncateText(description, META_DESCRIPTION_LIMIT),
  };
}

export function buildCategorySearchMetadata(categoryName: string, productCount: number) {
  const normalizedName = normalizeText(categoryName);
  const safeCount = Math.max(0, Math.floor(Number(productCount) || 0));
  return {
    title: `${normalizedName} 인기상품 ${safeCount.toLocaleString("ko-KR")}개 가격 비교`,
    description: truncateText(
      `${normalizedName} 상품 ${safeCount.toLocaleString("ko-KR")}개의 최근 실제 관측 가격을 한눈에 비교하세요. 상품별 가격 흐름과 쿠팡의 현재 판매 정보를 확인할 수 있습니다.`,
      META_DESCRIPTION_LIMIT
    ),
  };
}

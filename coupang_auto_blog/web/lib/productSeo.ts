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

export function buildProductPlainText(productName: string, categoryName: string | null, currentPriceKrw: number | null) {
  const normalizedName = normalizeText(productName);
  const normalizedCategory = categoryName ? normalizeText(categoryName) : "쿠팡";
  const price = observedPriceLabel(currentPriceKrw);
  const priceText = price
    ? `최근 세모링크가 관측한 ${normalizedName} 가격은 ${price}입니다.`
    : `${normalizedName} 가격은 쿠팡 판매 상태에 따라 달라질 수 있어 현재가 확인이 필요합니다.`;

  return {
    intro: `${normalizedName}은 ${normalizedCategory} 카테고리에서 가격 흐름을 확인할 수 있는 상품입니다. ${priceText}`,
    basis: "세모링크는 쿠팡 API에서 확인한 실제 응답 가격과 관측 시각만 기록하며, 임의로 가격을 추정하거나 과거 값을 현재 가격처럼 표시하지 않습니다.",
    compare: `${normalizedCategory} 상품을 비교할 때는 현재가, 최근 관측 시각, 같은 카테고리의 대체 상품을 함께 확인하는 것이 좋습니다.`,
  };
}

export function buildCategoryPlainText(categoryName: string, productCount: number) {
  const normalizedName = normalizeText(categoryName);
  const safeCount = Math.max(0, Math.floor(Number(productCount) || 0));
  return {
    intro: `${normalizedName} 카테고리에서 실제 가격 관측값이 있는 쿠팡 상품 ${safeCount.toLocaleString("ko-KR")}개를 모았습니다.`,
    basis: "각 상품은 가격 관측 기록과 검증된 쿠팡 이동 링크가 있는 항목을 우선 노출합니다.",
    compare: "검색엔진과 사용자가 상품 구조를 쉽게 따라갈 수 있도록 카테고리 목록, 상품 상세, 관련 상품을 서로 연결합니다.",
  };
}

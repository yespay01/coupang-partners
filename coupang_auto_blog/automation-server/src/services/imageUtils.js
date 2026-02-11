/**
 * 이미지 수집 유틸리티
 * 1단계: 스톡 이미지 (Unsplash/Pexels)
 * 2단계: AI 이미지 생성 (DALL-E)
 * 3단계: 쿠팡 상세 이미지 (Puppeteer)
 */

import { logger } from "../utils/logger.js";
import fetch from "node-fetch";

// 카테고리 ID → 검색 키워드 매핑
const CATEGORY_KEYWORDS = {
  "1001": ["fashion", "women clothing", "style"],
  "1002": ["fashion", "men clothing", "style"],
  "1010": ["beauty", "cosmetics", "skincare"],
  "1011": ["baby", "kids", "parenting"],
  "1012": ["food", "cooking", "kitchen"],
  "1013": ["kitchen", "cooking", "utensils"],
  "1014": ["home", "living", "household"],
  "1015": ["interior", "home decor", "furniture"],
  "1016": ["electronics", "gadget", "technology"],
  "1017": ["sports", "fitness", "outdoor"],
  "1018": ["car", "automotive", "vehicle"],
  "1019": ["books", "reading", "literature"],
  "1020": ["toys", "hobby", "games"],
  "1021": ["office", "stationery", "workspace"],
  "1024": ["health", "fitness", "wellness"],
  "1029": ["pet", "animals", "dog cat"],
  "1030": ["kids fashion", "children clothing", "baby wear"],
};

// 주요 브랜드명 리스트 (검색에서 제외)
const BRAND_NAMES = [
  // 쿠팡 자체 브랜드
  "탐사",
  // 식품
  "동원", "CJ", "오뚜기", "농심", "삼양", "풀무원", "롯데", "해태", "오리온", "빙그레",
  // 가전/전자
  "삼성", "LG", "애플", "Apple", "소니", "SONY", "필립스", "Philips", "샤오미",
  // 패션
  "나이키", "Nike", "아디다스", "adidas", "언더아머", "노스페이스", "블랙야크",
  // 뷰티
  "설화수", "아모레퍼시픽", "이니스프리", "에뛰드", "미샤", "토니모리",
  // 생활용품
  "유한킴벌리", "P&G", "LG생활건강", "애경", "크리넥스", "스카트",
  // 반려동물
  "로얄캐닌", "퓨리나", "힐스", "오리젠", "네이처스", "ANF", "뉴트로",
  // 유아용품
  "하기스", "Huggies", "팸퍼스", "Pampers", "마미포코", "바보사랑",
  // 기타
  "다이슨", "Dyson", "샤오미", "Xiaomi", "코카콜라", "펩시",
];

/**
 * 상품명에서 검색 키워드 추출
 * 브랜드명, 용량 등을 제거하고 핵심 키워드만 추출
 */
function extractKeywordFromProductName(productName) {
  if (!productName) return "product";

  let keyword = productName;

  // 1. 브랜드명 제거
  for (const brand of BRAND_NAMES) {
    const regex = new RegExp(brand, "gi");
    keyword = keyword.replace(regex, "");
  }

  // 2. 불필요한 부분 제거
  keyword = keyword
    .replace(/\[[^\]]*\]/g, "") // [대용량], [특가] 등 제거
    .replace(/\([^)]*\)/g, "") // (3kg), (10개입) 등 제거
    .replace(/\d+[gkmlL개입팩병캔포장]/g, "") // 용량/수량 제거
    .replace(/[0-9]+/g, "") // 숫자 제거
    .replace(/\s+/g, " ") // 연속된 공백 제거
    .trim();

  // 3. "실속형", "특가", "대용량" 같은 수식어 제거
  keyword = keyword
    .replace(/(실속형|특가|대용량|프리미엄|고급|한정판|신제품|베스트)/gi, "")
    .trim();

  // 4. 너무 긴 경우 앞부분만 사용 (첫 2단어)
  const words = keyword.split(/\s+/).filter((w) => w.length > 0);
  if (words.length > 2) {
    keyword = words.slice(0, 2).join(" ");
  } else if (words.length > 0) {
    keyword = words.join(" ");
  }

  // 5. 최소 길이 체크 (너무 짧으면 원본에서 다시 추출)
  if (keyword.length < 2) {
    const originalWords = productName.split(/\s+/);
    keyword = originalWords.slice(-2).join(" "); // 뒤에서 2단어
  }

  return keyword || "product";
}

/**
 * 카테고리에서 검색 키워드 가져오기 (폴백용)
 */
function getKeywordForCategory(categoryId) {
  const keywords = CATEGORY_KEYWORDS[categoryId] || ["product", "shopping"];
  return keywords[0]; // 첫 번째 키워드 사용
}

/**
 * 1단계: Unsplash에서 스톡 이미지 가져오기
 */
export async function fetchUnsplashImages(product, settings) {
  const { apiKey, count } = settings.images.stockImages;

  if (!apiKey) {
    logger.warn("Unsplash API 키가 설정되지 않았습니다");
    return [];
  }

  try {
    // 상품명에서 키워드 추출
    const productName = product.name || product.productName || "";
    const keyword = extractKeywordFromProductName(productName);
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=${count}&orientation=landscape`;

    logger.info(`Unsplash 이미지 검색: "${keyword}" (원본: "${productName}") (${count}장)`);
    logger.info(`Unsplash API URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${apiKey}`,
      },
    });

    logger.info(`Unsplash API 응답 상태: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Unsplash API 오류: ${response.status} - ${errorText}`);
      throw new Error(`Unsplash API 오류: ${response.status}`);
    }

    let data = await response.json();
    logger.info(`Unsplash API 응답 데이터: total=${data.total}, results=${data.results?.length || 0}`);

    // 한국어 키워드로 결과가 없으면 카테고리 영어 키워드로 재검색
    if ((!data.results || data.results.length === 0) && product.categoryId) {
      const fallbackKeyword = getKeywordForCategory(product.categoryId);
      logger.info(`Unsplash 한국어 검색 결과 없음 → 카테고리 영어 키워드로 재검색: "${fallbackKeyword}"`);

      const fallbackUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(fallbackKeyword)}&per_page=${count}&orientation=landscape`;
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: { Authorization: `Client-ID ${apiKey}` },
      });

      if (fallbackResponse.ok) {
        data = await fallbackResponse.json();
        logger.info(`Unsplash 카테고리 재검색 결과: total=${data.total}, results=${data.results?.length || 0}`);
      }
    }

    // 그래도 없으면 상품명 첫 단어 + "product"로 최종 시도
    if (!data.results || data.results.length === 0) {
      const genericKeyword = "product shopping";
      logger.info(`Unsplash 카테고리 검색도 실패 → 범용 키워드로 최종 시도: "${genericKeyword}"`);

      const genericUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(genericKeyword)}&per_page=${count}&orientation=landscape`;
      const genericResponse = await fetch(genericUrl, {
        headers: { Authorization: `Client-ID ${apiKey}` },
      });

      if (genericResponse.ok) {
        data = await genericResponse.json();
      }
    }

    if (!data.results || data.results.length === 0) {
      logger.warn(`Unsplash에서 이미지를 찾을 수 없습니다 (모든 검색 실패)`);
      return [];
    }

    const images = data.results.slice(0, count).map((img) => ({
      type: "image",
      url: img.urls.regular,
      alt: img.alt_description || `${keyword} 관련 이미지`,
      credit: `Photo by ${img.user.name} on Unsplash`,
      creditUrl: img.user.links.html,
    }));

    logger.info(`Unsplash 이미지 ${images.length}장 가져오기 성공`);
    return images;
  } catch (error) {
    logger.error("Unsplash 이미지 가져오기 실패:", {
      message: error.message,
      stack: error.stack,
    });
    return [];
  }
}

/**
 * 1단계: Pexels에서 스톡 이미지 가져오기
 */
export async function fetchPexelsImages(product, settings) {
  const { apiKey, count } = settings.images.stockImages;

  if (!apiKey) {
    logger.warn("Pexels API 키가 설정되지 않았습니다");
    return [];
  }

  try {
    // 상품명에서 키워드 추출
    const productName = product.name || product.productName || "";
    const keyword = extractKeywordFromProductName(productName);
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=${count}&orientation=landscape`;

    logger.info(`Pexels 이미지 검색: "${keyword}" (원본: "${productName}") (${count}장)`);

    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Pexels API 오류: ${response.status}`);
    }

    let data = await response.json();

    // 한국어 키워드로 결과가 없으면 카테고리 영어 키워드로 재검색
    if ((!data.photos || data.photos.length === 0) && product.categoryId) {
      const fallbackKeyword = getKeywordForCategory(product.categoryId);
      logger.info(`Pexels 한국어 검색 결과 없음 → 카테고리 영어 키워드로 재검색: "${fallbackKeyword}"`);

      const fallbackUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(fallbackKeyword)}&per_page=${count}&orientation=landscape`;
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: { Authorization: apiKey },
      });

      if (fallbackResponse.ok) {
        data = await fallbackResponse.json();
      }
    }

    // 그래도 없으면 범용 키워드로 최종 시도
    if (!data.photos || data.photos.length === 0) {
      const genericUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent("product shopping")}&per_page=${count}&orientation=landscape`;
      const genericResponse = await fetch(genericUrl, {
        headers: { Authorization: apiKey },
      });

      if (genericResponse.ok) {
        data = await genericResponse.json();
      }
    }

    if (!data.photos || data.photos.length === 0) {
      logger.warn(`Pexels에서 이미지를 찾을 수 없습니다 (모든 검색 실패)`);
      return [];
    }

    const images = data.photos.slice(0, count).map((photo) => ({
      type: "image",
      url: photo.src.large,
      alt: photo.alt || `${keyword} 관련 이미지`,
      credit: `Photo by ${photo.photographer} on Pexels`,
      creditUrl: photo.photographer_url,
    }));

    logger.info(`Pexels 이미지 ${images.length}장 가져오기 성공`);
    return images;
  } catch (error) {
    logger.error("Pexels 이미지 가져오기 실패:", error);
    return [];
  }
}

/**
 * 1단계: 스톡 이미지 가져오기 (통합)
 */
export async function fetchStockImages(product, settings) {
  if (!settings.images?.stockImages?.enabled) {
    return [];
  }

  const provider = settings.images.stockImages.provider || "unsplash";

  if (provider === "unsplash") {
    return fetchUnsplashImages(product, settings);
  } else if (provider === "pexels") {
    return fetchPexelsImages(product, settings);
  }

  return [];
}

/**
 * 2단계: AI 이미지 생성 (DALL-E)
 */
export async function generateAIImages(product, settings) {
  if (!settings.images?.aiImages?.enabled) {
    return [];
  }

  const { count, quality, provider } = settings.images.aiImages;

  if (provider !== "dalle") {
    logger.warn(`AI 이미지 생성: ${provider}는 아직 지원되지 않습니다`);
    return [];
  }

  // OpenAI API 키 확인
  const openaiApiKey = settings.ai?.openai?.apiKey;
  if (!openaiApiKey) {
    logger.warn("OpenAI API 키가 설정되지 않았습니다");
    return [];
  }

  try {
    const productName = product.name || product.productName;
    const category = product.category || product.categoryName;

    // 프롬프트 생성
    const prompt = `A professional product photography of ${productName}, ${category} category, clean background, high quality, commercial style, lifestyle photo`;

    logger.info(`DALL-E 이미지 생성: ${prompt.substring(0, 50)}...`);

    const images = [];

    // count만큼 이미지 생성
    for (let i = 0; i < count; i++) {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: quality || "standard",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`DALL-E API 오류: ${response.status} - ${error}`);
      }

      const data = await response.json();

      if (data.data && data.data.length > 0) {
        images.push({
          type: "image",
          url: data.data[0].url,
          alt: `${productName} AI 생성 이미지`,
          credit: "Generated by DALL-E",
        });
        logger.info(`DALL-E 이미지 ${i + 1}/${count} 생성 성공`);
      }
    }

    logger.info(`DALL-E 이미지 총 ${images.length}장 생성 완료`);
    return images;
  } catch (error) {
    logger.error("DALL-E 이미지 생성 실패:", error);
    return [];
  }
}

/**
 * 3단계: 쿠팡 상세 이미지 스크래핑 (Puppeteer)
 */
export async function scrapeCoupangImages(product, settings) {
  if (!settings.images?.coupangDetailImages?.enabled) {
    return [];
  }

  const { maxCount, delayMs } = settings.images.coupangDetailImages;

  // productUrl이 없으면 스킵
  if (!product.productUrl) {
    logger.warn("상품 URL이 없어 쿠팡 이미지를 가져올 수 없습니다");
    return [];
  }

  try {
    // Puppeteer 동적 import
    const puppeteer = await import("puppeteer");

    logger.info(`쿠팡 상세 이미지 수집 시작: ${product.productUrl}`);

    // Rate limiting
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // User-Agent 설정 (봇 감지 회피)
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(product.productUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // 상세 이미지 추출
    const imageUrls = await page.$$eval(
      ".prod-image__detail img, .product-image-slide img",
      (imgs) => imgs.map((img) => img.src).filter(Boolean)
    );

    await browser.close();

    // 중복 제거 및 maxCount 제한
    const uniqueUrls = [...new Set(imageUrls)].slice(0, maxCount);

    const images = uniqueUrls.map((url, index) => ({
      type: "image",
      url: url,
      alt: `${product.name || product.productName} 상세 이미지 ${index + 1}`,
      credit: "Coupang",
    }));

    logger.info(`쿠팡 상세 이미지 ${images.length}장 수집 성공`);
    return images;
  } catch (error) {
    logger.error("쿠팡 상세 이미지 수집 실패:", error);
    return [];
  }
}

/**
 * 모든 이미지 소스에서 이미지 수집
 */
export async function collectAllImages(product, settings) {
  logger.info("=== collectAllImages 시작 ===", {
    productId: product.productId,
    productName: product.productName || product.name,
    hasSettings: !!settings,
    hasImagesConfig: !!settings?.images,
  });

  const allImages = [];

  try {
    // 1. 쿠팡 메인 이미지 (항상 포함)
    if (product.productImage) {
      allImages.push({
        type: "image",
        url: product.productImage,
        alt: product.name || product.productName || "상품 이미지",
        credit: "Coupang",
      });
      logger.info("쿠팡 메인 이미지 추가됨");
    }

    // 2. 스톡 이미지
    logger.info("스톡 이미지 설정 확인", {
      enabled: settings.images?.stockImages?.enabled,
      provider: settings.images?.stockImages?.provider,
      hasApiKey: !!settings.images?.stockImages?.apiKey,
    });

    if (settings.images?.stockImages?.enabled) {
      logger.info("스톡 이미지 수집 시작...");
      const stockImages = await fetchStockImages(product, settings);
      allImages.push(...stockImages);
      logger.info(`스톡 이미지 ${stockImages.length}장 추가됨`);
    } else {
      logger.info("스톡 이미지 비활성화됨");
    }

    // 3. AI 생성 이미지
    if (settings.images?.aiImages?.enabled) {
      logger.info("AI 이미지 생성 시작...");
      const aiImages = await generateAIImages(product, settings);
      allImages.push(...aiImages);
      logger.info(`AI 이미지 ${aiImages.length}장 추가됨`);
    }

    // 4. 쿠팡 상세 이미지
    if (settings.images?.coupangDetailImages?.enabled) {
      logger.info("쿠팡 상세 이미지 수집 시작...");
      const coupangImages = await scrapeCoupangImages(product, settings);
      allImages.push(...coupangImages);
      logger.info(`쿠팡 상세 이미지 ${coupangImages.length}장 추가됨`);
    }

    logger.info(`총 ${allImages.length}장의 이미지 수집 완료`, {
      productId: product.productId,
      sources: {
        main: product.productImage ? 1 : 0,
        stock: settings.images?.stockImages?.enabled ? "yes" : "no",
        ai: settings.images?.aiImages?.enabled ? "yes" : "no",
        coupang: settings.images?.coupangDetailImages?.enabled ? "yes" : "no",
      },
    });

    return allImages;
  } catch (error) {
    logger.error("collectAllImages 에러 발생:", error);
    // 에러가 발생해도 최소한 메인 이미지는 반환
    return allImages;
  }
}

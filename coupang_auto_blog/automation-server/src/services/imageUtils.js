/**
 * 이미지 수집 유틸리티
 * 1단계: 스톡 이미지 (Unsplash/Pexels)
 * 2단계: AI 이미지 생성 (DALL-E)
 * 3단계: 쿠팡 상세 이미지 (Puppeteer)
 */

import { logger } from "../utils/logger.js";
import fetch from "node-fetch";
import { generateText } from "./aiProviders.js";

// 카테고리 ID → 검색 키워드 매핑
const CATEGORY_KEYWORDS = {
  "1001": ["women fashion", "women clothing", "dress style"],
  "1002": ["men fashion", "men clothing", "menswear"],
  "1010": ["skincare beauty", "cosmetics", "face cream"],
  "1011": ["baby products", "baby care", "infant"],
  "1012": ["food ingredients", "cooking food", "grocery"],
  "1013": ["kitchen utensils", "cooking tools", "cookware"],
  "1014": ["home appliance", "household items", "living essentials"],
  "1015": ["home interior", "home decor", "furniture"],
  "1016": ["electronics", "gadget", "smart device"],
  "1017": ["sports equipment", "fitness gear", "outdoor activity"],
  "1018": ["car accessories", "automotive parts", "vehicle"],
  "1019": ["books reading", "literature", "education"],
  "1020": ["toys games", "hobby craft", "board game"],
  "1021": ["office supplies", "stationery", "desk accessories"],
  "1024": ["health supplement", "wellness", "vitamin"],
  "1029": ["pet accessories", "dog food", "cat care"],
  "1030": ["children clothing", "kids fashion", "baby wear"],
};

// 한국어 핵심 단어 → 영어 검색 키워드 변환 사전
const KO_TO_EN_KEYWORDS = {
  // 뷰티/스킨케어
  "스킨케어": "skincare",
  "로션": "lotion skincare",
  "크림": "face cream skincare",
  "세럼": "serum skincare",
  "에센스": "essence skincare",
  "선크림": "sunscreen SPF",
  "마스크팩": "sheet mask skincare",
  "샴푸": "shampoo hair care",
  "헤어": "hair care",
  "향수": "perfume fragrance",
  "립스틱": "lipstick makeup",
  "파운데이션": "foundation makeup",
  "아이섀도": "eyeshadow makeup",
  // 가전/전자
  "이어폰": "earphone headphone",
  "에어팟": "wireless earbuds",
  "블루투스": "bluetooth wireless",
  "스피커": "bluetooth speaker",
  "노트북": "laptop computer",
  "태블릿": "tablet computer",
  "스마트폰": "smartphone mobile",
  "충전기": "charger cable",
  "마우스": "computer mouse",
  "키보드": "keyboard computer",
  "모니터": "monitor screen",
  "카메라": "camera photography",
  "청소기": "vacuum cleaner",
  "에어컨": "air conditioner cooling",
  "냉장고": "refrigerator kitchen",
  "세탁기": "washing machine",
  "전자레인지": "microwave oven",
  "드라이기": "hair dryer",
  // 패션
  "티셔츠": "t-shirt casual wear",
  "청바지": "jeans denim",
  "원피스": "dress women fashion",
  "운동화": "sneakers shoes",
  "구두": "dress shoes leather",
  "가방": "bag handbag",
  "지갑": "wallet purse",
  "시계": "watch accessory",
  "선글라스": "sunglasses eyewear",
  "후드": "hoodie sweatshirt",
  "자켓": "jacket outerwear",
  "코트": "coat winter fashion",
  // 식품
  "커피": "coffee beans",
  "녹차": "green tea",
  "홍삼": "red ginseng health",
  "비타민": "vitamin supplement",
  "단백질": "protein supplement fitness",
  "견과류": "nuts healthy snack",
  "과자": "snack food",
  // 스포츠/아웃도어
  "요가": "yoga mat fitness",
  "런닝": "running shoes jogging",
  "등산": "hiking outdoor",
  "자전거": "bicycle cycling",
  "헬스": "gym fitness workout",
  "수영": "swimming sport",
  "텐트": "camping tent outdoor",
  // 주방/생활
  "냄비": "cookware pot kitchen",
  "프라이팬": "frying pan cooking",
  "도마": "cutting board kitchen",
  "칼": "kitchen knife cooking",
  "텀블러": "tumbler water bottle",
  "그릇": "bowl dishes tableware",
  "소파": "sofa couch living room",
  "침대": "bed bedroom furniture",
  "책상": "desk office furniture",
  "의자": "chair furniture",
  "조명": "lighting lamp home",
  "커튼": "curtain home decor",
  "카펫": "carpet rug flooring",
  // 반려동물
  "강아지": "dog pet",
  "고양이": "cat pet",
  "사료": "pet food",
  "펫": "pet accessories",
  // 유아
  "기저귀": "diaper baby care",
  "유모차": "stroller baby",
  "분유": "baby formula milk",
  "장난감": "toy children play",
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
 * AI를 활용해 한국어 상품명에서 영어 이미지 검색 키워드 추출
 * maxTokens: 30으로 API 비용 최소화
 */
async function extractKeywordWithAI(productName, aiSettings) {
  if (!productName || !aiSettings) return null;

  try {
    const prompt = `다음 한국어 상품명을 보고 Unsplash/Pexels 이미지 검색에 쓸 영어 키워드 2~3개만 출력하세요.
상품명: "${productName}"
규칙: 영어 단어만, 공백 구분, 브랜드명/수량 제외, 상품의 핵심 특성 위주
예시 출력: bluetooth earphone wireless`;

    const result = await generateText(
      { ...aiSettings, maxTokens: 30, temperature: 0.1 },
      prompt,
      ""
    );

    // 영어/숫자/공백만 남기고 정제
    const keyword = result.text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (keyword && keyword.length > 2) {
      logger.info(`AI 키워드 추출 성공: "${productName}" → "${keyword}"`);
      return keyword;
    }
    return null;
  } catch (error) {
    logger.warn(`AI 키워드 추출 실패 (${productName}): ${error.message}`);
    return null;
  }
}

/**
 * 사전 기반 폴백: 한국어 상품명에서 영어 키워드 추출
 * AI 실패 시에만 사용
 */
function extractKeywordFromProductName(productName) {
  if (!productName) return null;

  // KO_TO_EN_KEYWORDS 사전에서 매칭
  for (const [koWord, enKeyword] of Object.entries(KO_TO_EN_KEYWORDS)) {
    if (productName.includes(koWord)) {
      logger.info(`사전 키워드 변환: "${koWord}" → "${enKeyword}"`);
      return enKeyword;
    }
  }

  return null;
}

// 카테고리 이름(한국어) → 영어 키워드 매핑
const CATEGORY_NAME_KEYWORDS = {
  "패션의류": "fashion clothing style",
  "여성패션": "women fashion clothing",
  "남성패션": "men fashion clothing",
  "뷰티": "beauty skincare cosmetics",
  "스킨케어": "skincare face cream",
  "헤어케어": "hair care shampoo",
  "유아동": "baby kids children",
  "식품": "food grocery cooking",
  "주방용품": "kitchen cookware utensils",
  "생활용품": "household items home essentials",
  "가구/인테리어": "furniture home interior",
  "가전디지털": "electronics gadget tech",
  "스포츠/레저": "sports fitness outdoor",
  "자동차용품": "car accessories automotive",
  "도서": "books reading",
  "완구/취미": "toys hobby games",
  "문구/오피스": "office stationery",
  "헬스/건강식품": "health supplement wellness",
  "반려동물": "pet dog cat accessories",
  "출산/육아": "baby parenting infant",
};

/**
 * 카테고리에서 검색 키워드 가져오기 (폴백용)
 * categoryId 또는 categoryName 중 하나라도 있으면 사용
 */
function getKeywordForCategory(categoryId, categoryName) {
  // 카테고리 ID로 먼저 찾기
  if (categoryId && CATEGORY_KEYWORDS[categoryId]) {
    return CATEGORY_KEYWORDS[categoryId][0];
  }

  // 카테고리 이름으로 찾기 (부분 매칭)
  if (categoryName) {
    for (const [koName, enKeyword] of Object.entries(CATEGORY_NAME_KEYWORDS)) {
      if (categoryName.includes(koName) || koName.includes(categoryName)) {
        return enKeyword;
      }
    }
  }

  // 둘 다 없으면 null 반환 (이미지 수집 포기)
  return null;
}

/**
 * 1단계: Unsplash에서 스톡 이미지 가져오기
 */
export async function fetchUnsplashImages(product, settings) {
  const stockSettings = settings.images.stockImages;
  const { count } = stockSettings;
  const apiKey = stockSettings.apiKeys?.unsplash || stockSettings.apiKey;

  if (!apiKey) {
    logger.warn("Unsplash API 키가 설정되지 않았습니다");
    return [];
  }

  try {
    const productName = product.name || product.productName || "";
    const categoryId = product.categoryId;
    const categoryName = product.category || product.categoryName || "";

    // 1순위: AI로 상품명 분석 → 영어 키워드 추출
    let keyword = await extractKeywordWithAI(productName, settings.ai);

    // 2순위: AI 실패 시 사전 기반 폴백
    if (!keyword) {
      keyword = extractKeywordFromProductName(productName);
    }

    // 3순위: 사전도 없으면 카테고리 기반 폴백
    if (!keyword) {
      keyword = getKeywordForCategory(categoryId, categoryName);
      if (keyword) logger.info(`카테고리 폴백 사용: "${keyword}"`);
    }

    if (!keyword) {
      logger.warn(`Unsplash: 키워드 없음, 이미지 수집 스킵 (상품: "${productName}")`);
      return [];
    }

    logger.info(`Unsplash 이미지 검색: "${keyword}" (상품: "${productName}") (${count}장)`);

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${apiKey}` } }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Unsplash API 오류: ${response.status} - ${errorText}`);
      throw new Error(`Unsplash API 오류: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`Unsplash 결과: total=${data.total}, results=${data.results?.length || 0}`);

    if (!data.results || data.results.length === 0) {
      logger.warn(`Unsplash 결과 없음 (키워드: "${keyword}")`);
      return [];
    }

    const images = data.results.slice(0, count).map((img) => ({
      type: "image",
      url: img.urls.regular,
      alt: img.alt_description || `${keyword} 이미지`,
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
  const stockSettings = settings.images.stockImages;
  const { count } = stockSettings;
  const apiKey = stockSettings.apiKeys?.pexels || stockSettings.apiKey;

  if (!apiKey) {
    logger.warn("Pexels API 키가 설정되지 않았습니다");
    return [];
  }

  try {
    const productName = product.name || product.productName || "";
    const categoryId = product.categoryId;
    const categoryName = product.category || product.categoryName || "";

    // 1순위: AI로 상품명 분석 → 영어 키워드 추출
    let keyword = await extractKeywordWithAI(productName, settings.ai);

    // 2순위: AI 실패 시 사전 기반 폴백
    if (!keyword) {
      keyword = extractKeywordFromProductName(productName);
    }

    // 3순위: 카테고리 기반 폴백
    if (!keyword) {
      keyword = getKeywordForCategory(categoryId, categoryName);
      if (keyword) logger.info(`카테고리 폴백 사용: "${keyword}"`);
    }

    if (!keyword) {
      logger.warn(`Pexels: 키워드 없음, 이미지 수집 스킵 (상품: "${productName}")`);
      return [];
    }

    logger.info(`Pexels 이미지 검색: "${keyword}" (상품: "${productName}") (${count}장)`);

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    );

    if (!response.ok) {
      throw new Error(`Pexels API 오류: ${response.status}`);
    }

    const data = await response.json();

    if (!data.photos || data.photos.length === 0) {
      logger.warn(`Pexels 결과 없음 (키워드: "${keyword}")`);
      return [];
    }

    const images = data.photos.slice(0, count).map((photo) => ({
      type: "image",
      url: photo.src.large,
      alt: photo.alt || `${keyword} 이미지`,
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
      hasApiKey: !!(
        settings.images?.stockImages?.apiKeys?.[settings.images?.stockImages?.provider || "unsplash"] ||
        settings.images?.stockImages?.apiKey
      ),
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

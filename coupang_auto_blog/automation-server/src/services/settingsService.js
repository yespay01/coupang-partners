/**
 * 시스템 설정 서비스
 * PostgreSQL에서 설정을 로드하고 캐싱 관리
 */

import { getDb } from '../config/database.js';

// 설정 캐시 (5분)
let cachedSettings = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5분

// 기본 설정 (DB에서 로드 실패 시 사용)
const DEFAULT_SETTINGS = {
  ai: {
    defaultProvider: "openai",
    openai: { apiKey: process.env.OPENAI_API_KEY ?? "", model: "gpt-4o-mini" },
    anthropic: { apiKey: "", model: "claude-3-5-sonnet-20241022" },
    google: { apiKey: "", model: "gemini-2.5-flash" },
    temperature: 0.7,
    maxTokens: 2048,
  },
  prompt: {
    systemPrompt: `당신은 제공된 상품 정보만으로 구매 판단을 돕는 상품 선택 가이드 작성자입니다.

핵심 원칙:
- 상품명과 카테고리 등 입력으로 확인되는 사실만 사용하기
- 실제 구매자나 사용자인 것처럼 1인칭 경험을 만들지 않기
- 확인되지 않은 내용은 단정하지 말고 구매 페이지에서 확인할 항목으로 안내하기
- 독자가 용도, 구성, 옵션, 가격을 비교할 수 있는 실용적인 기준 제시하기
- 짧고 명확한 문장과 자연스러운 문단 사용하기

절대 금지 (어기면 결과물이 폐기됩니다):
- 직접 사용, 구매, 섭취, 착용했다고 주장하는 표현
- 내돈내산, 배송 속도, 포장 상태, 실물 느낌 등 확인되지 않은 체험
- 임의의 성능, 재질, 규격, 원산지, 효능, 별점, 후기 수
- 최저가, 재고 있음, 할인율, 로켓배송 등 입력으로 확인되지 않은 가격·혜택
- 상품명에서 확인할 수 없는 장점과 단점을 사실처럼 단정하는 표현
- 마크다운 사용 금지: **별표**, ##헤더, --- 구분선, > 인용, * 리스트 모두 금지
- 단계/섹션 라벨과 제목 없이 첫 문장부터 선택 기준을 설명할 것
- 자연스러운 단락 구분만 사용 (빈 줄로 단락 나눔)`,
    reviewTemplate: `{productName} ({category}) 상품을 검토하는 사람을 위한 사실 기반 선택 가이드를 작성해주세요.

{minLength}~{maxLength}자 분량의 자연스러운 산문으로 작성하되, 아래 흐름을 머릿속에서만 따라가세요. 본문에는 단계 번호나 섹션 제목을 쓰지 마세요.

흐름 (라벨 출력 금지, 머릿속 가이드용):
- 도입: 이 카테고리 상품을 고를 때 먼저 정할 용도와 예산
- 확인된 정보: 상품명에서 명확히 읽을 수 있는 종류, 구성, 용량 또는 모델 정보만 설명
- 비교 기준: 옵션, 단위당 가격, 크기·호환성, 보관 조건 등 구매 전에 확인할 항목
- 적합성: 어떤 필요를 가진 사람이 후보로 검토할 수 있는지 조건부로 안내
- 주의점: 상품명만으로 알 수 없어 쿠팡 상품 페이지에서 다시 확인해야 하는 정보
- 마무리: 가격과 옵션이 변동될 수 있으므로 최종 구매 전 현재 정보를 확인하도록 안내

검색 노출 규칙:
- 상품명을 본문에 2~3회 자연스럽게 포함 (억지 반복 금지, 문맥에 맞게)
- {category} 선택 기준과 상품 비교처럼 실제 정보 탐색에 도움이 되는 표현을 자연스럽게 사용
- 입력에 없는 수치나 사양을 만들지 말고 확인할 기준을 구체적으로 설명하기

문체 규칙:
- 차분하고 쉬운 설명체 사용
- 광고성 문구 금지 (최고의, 강력 추천, 혁신적인, 놀라운)
- 과장 표현 금지 (100%, 완벽한, 최강)
- 체험을 암시하는 1인칭 표현과 내돈내산 표현 금지
- 마크다운/별표/헤더/번호 절대 금지
- 첫 문장은 상품 선택에 필요한 핵심 기준으로 바로 시작 (제목·인사·라벨 없이)`,
    minLength: 800,
    maxLength: 1200,
    toneScoreThreshold: 0.4,
  },
  images: {
    stockImages: {
      enabled: false,
      provider: "unsplash",
      apiKey: "",
      apiKeys: {
        unsplash: "",
        pexels: "",
      },
      count: 2,
    },
    aiImages: {
      enabled: false,
      provider: "dalle",
      count: 1,
      quality: "standard",
    },
    coupangDetailImages: {
      enabled: false,
      maxCount: 3,
      delayMs: 2000,
    },
  },
  coupang: {
    enabled: false,
    accessKey: "",
    secretKey: "",
  },
  topics: {
    goldboxEnabled: true,
    keywords: [],
    categories: [],
    coupangPLBrands: [],
  },
  automation: {
    enabled: false,
    schedule: "0 8 * * *",
    maxProductsPerRun: 100,
    reviewGeneration: {
      enabled: false,
      maxPerRun: 5,
      schedule: "03:00",
      pauseWhenDraftCountExceeds: 50,
    },
    newsGeneration: {
      enabled: false,
      morningSchedule: "07:00",
      afternoonSchedule: "18:00",
    },
  },
};

/**
 * PostgreSQL에서 시스템 설정 로드 (캐싱 적용)
 * @returns {Promise<Object>} 시스템 설정
 */
export async function getSystemSettings() {
  const now = Date.now();

  // 캐시가 유효하면 반환
  if (cachedSettings && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const db = getDb();

    // settings 테이블에서 모든 설정 조회
    const result = await db.query('SELECT key, value FROM settings');

    if (result.rows.length === 0) {
      console.warn('시스템 설정이 없습니다. 기본값 사용.');
      cachedSettings = DEFAULT_SETTINGS;
      cacheTimestamp = now;
      return DEFAULT_SETTINGS;
    }

    // 설정을 key-value 맵으로 변환
    const settingsMap = {};
    result.rows.forEach(row => {
      settingsMap[row.key] = row.value;
    });

    // DB에 key='system'으로 하나의 JSONB blob으로 저장되므로
    // settingsMap.system에서 추출하여 기본값과 deep merge
    const systemData = settingsMap.system || {};

    cachedSettings = {
      ai: { ...DEFAULT_SETTINGS.ai, ...(systemData.ai || {}) },
      prompt: { ...DEFAULT_SETTINGS.prompt, ...(systemData.prompt || {}) },
      images: {
        stockImages: { ...DEFAULT_SETTINGS.images.stockImages, ...(systemData.images?.stockImages || {}) },
        aiImages: { ...DEFAULT_SETTINGS.images.aiImages, ...(systemData.images?.aiImages || {}) },
        coupangDetailImages: { ...DEFAULT_SETTINGS.images.coupangDetailImages, ...(systemData.images?.coupangDetailImages || {}) },
      },
      coupang: { ...DEFAULT_SETTINGS.coupang, ...(systemData.coupang || {}) },
      topics: { ...DEFAULT_SETTINGS.topics, ...(systemData.topics || {}) },
      automation: {
        ...DEFAULT_SETTINGS.automation,
        ...(systemData.automation || {}),
        reviewGeneration: {
          ...DEFAULT_SETTINGS.automation.reviewGeneration,
          ...(systemData.automation?.reviewGeneration || {}),
        },
        newsGeneration: {
          ...DEFAULT_SETTINGS.automation.newsGeneration,
          ...(systemData.automation?.newsGeneration || {}),
        },
      },
    };

    const stockImages = cachedSettings.images?.stockImages;
    if (stockImages) {
      const provider = stockImages.provider || "unsplash";
      const legacyApiKey = stockImages.apiKey || "";
      stockImages.apiKeys = {
        unsplash: stockImages.apiKeys?.unsplash || (provider === "unsplash" ? legacyApiKey : ""),
        pexels: stockImages.apiKeys?.pexels || (provider === "pexels" ? legacyApiKey : ""),
      };
    }
    cacheTimestamp = now;

    return cachedSettings;
  } catch (error) {
    console.error('시스템 설정 로드 실패:', error);
    // 에러 시 캐시가 있으면 캐시 반환, 없으면 기본값
    return cachedSettings || DEFAULT_SETTINGS;
  }
}

/**
 * 설정 캐시 무효화
 */
export function invalidateSettingsCache() {
  cachedSettings = null;
  cacheTimestamp = 0;
  console.info('설정 캐시가 무효화되었습니다.');
}

/**
 * 현재 캐시 상태 확인
 * @returns {Object} 캐시 정보
 */
export function getCacheInfo() {
  const now = Date.now();
  const isValid = cachedSettings && (now - cacheTimestamp) < CACHE_TTL;
  const age = cachedSettings ? Math.floor((now - cacheTimestamp) / 1000) : null;

  return {
    isCached: !!cachedSettings,
    isValid,
    ageInSeconds: age,
    ttlInSeconds: CACHE_TTL / 1000,
  };
}

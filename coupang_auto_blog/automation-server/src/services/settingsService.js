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
    systemPrompt: `당신은 네이버 상위 블로거처럼 자연스럽고 생생한 상품 리뷰를 쓰는 작성자입니다.

핵심 원칙:
- 광고/홍보 느낌이 아닌, 실제 사용해본 사람의 솔직한 후기처럼 쓰기
- 짧고 리듬감 있는 문장 (한 문단 2~3문장)
- 카테고리에 맞는 말투 사용:
  • 식품/건강: 친근한 구어체 (~더라고요, ~해보니까)
  • 뷰티/패션: 감성적 묘사 (촉촉하게, 핏이 예뻐서)
  • 생활용품: 실용 정보 중심 (세게 눌러도, 빨리 마르고)
  • IT/전자: 간결한 기능 중심 (반응이 빠르고, 연결이 잘 돼서)

절대 금지 (어기면 결과물이 폐기됩니다):
- 마크다운 사용 금지: **별표**, ##헤더, --- 구분선, > 인용, * 리스트 모두 금지
- 단계/섹션 라벨 금지: "[1단계: 구매 계기]", "1.", "구매 계기:" 같은 라벨을 본문에 절대 쓰지 말 것
- 제목/표제 금지: "솔직 후기", "사용 후기", "리뷰" 같이 제목 형태로 시작하지 말 것
- 본문은 첫 문장부터 바로 일상 상황·계기 묘사로 시작 (예: "퇴근하고 집에 와서…", "요즘 ~ 때문에…")
- 자연스러운 단락 구분만 사용 (빈 줄로 단락 나눔)`,
    reviewTemplate: `{productName} ({category}) 사용 후기를 솔직하게 작성해주세요.

{minLength}~{maxLength}자 분량의 자연스러운 산문으로 작성하되, 다음 흐름을 머릿속에서만 따라가세요. 절대 본문에 단계 번호, "[N단계]" 라벨, "구매 계기:" 같은 섹션 제목을 쓰지 말고, 그냥 이어지는 문단으로 풀어내세요.

흐름 (라벨 출력 금지, 머릿속 가이드용):
- 처음: 왜 이 상품을 찾게 됐는지 (개인적인 상황·계기 1~2문장)
- 중간: 받아보고 써본 구체적인 감각·경험 (2~3문장)
- 평가: 좋은 점 1~2가지, 아쉬운 점 1가지를 자연스럽게 녹여서
- 끝: 어떤 분께 추천하는지 한 문장

규칙:
- 구어체로 자연스럽게 (~더라고요, ~해서 좋았어요, ~인 것 같아요)
- 광고성 문구 금지 (최고의, 강력 추천, 혁신적인, 놀라운)
- 과장 표현 금지 (100%, 완벽한, 최강)
- 마크다운/별표/헤더/번호 절대 금지
- 첫 문장은 본인의 상황·계기 묘사로 바로 시작 (제목·인사·라벨 없이)`,
    minLength: 400,
    maxLength: 600,
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
    maxProductsPerRun: 50,
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

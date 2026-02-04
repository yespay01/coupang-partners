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
    maxTokens: 1024,
  },
  prompt: {
    systemPrompt: "당신은 전문적인 상품 리뷰 작성자입니다.",
    reviewTemplate: "{productName} ({category}) 상품에 대한 후기를 생생하게 작성해주세요. {minLength}~{maxLength}자 분량으로, 실제 사용 경험처럼 묘사하고 광고성 문구는 삼가주세요.",
    minLength: 90,
    maxLength: 170,
    toneScoreThreshold: 0.4,
  },
  images: {
    stockImages: {
      enabled: false,
      provider: "unsplash",
      apiKey: "",
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

    // 기본값과 병합
    cachedSettings = {
      ai: { ...DEFAULT_SETTINGS.ai, ...(settingsMap.ai || {}) },
      prompt: { ...DEFAULT_SETTINGS.prompt, ...(settingsMap.prompt || {}) },
      images: {
        stockImages: { ...DEFAULT_SETTINGS.images.stockImages, ...(settingsMap.images?.stockImages || {}) },
        aiImages: { ...DEFAULT_SETTINGS.images.aiImages, ...(settingsMap.images?.aiImages || {}) },
        coupangDetailImages: { ...DEFAULT_SETTINGS.images.coupangDetailImages, ...(settingsMap.images?.coupangDetailImages || {}) },
      },
      coupang: { ...DEFAULT_SETTINGS.coupang, ...(settingsMap.coupang || {}) },
      topics: { ...DEFAULT_SETTINGS.topics, ...(settingsMap.topics || {}) },
      automation: { ...DEFAULT_SETTINGS.automation, ...(settingsMap.automation || {}) },
    };
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

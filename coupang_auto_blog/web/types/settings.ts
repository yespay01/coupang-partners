/**
 * 시스템 설정 타입 정의
 * Firestore system_settings/global 문서 스키마
 */

// ==================== AI Provider ====================

export type AIProvider = "openai" | "anthropic" | "google";

export type OpenAIModel = "gpt-4o-mini" | "gpt-4o" | "gpt-4-turbo";

export type AnthropicModel = "claude-3-5-sonnet-20241022" | "claude-3-opus-20240229" | "claude-3-5-haiku-20241022";

export type GoogleModel = "gemini-1.5-pro" | "gemini-1.5-flash" | "gemini-2.0-flash-exp";

export type AIProviderConfig = {
  apiKey: string;
  model: string;
};

export type AISettings = {
  defaultProvider: AIProvider;
  openai: AIProviderConfig & { model: OpenAIModel };
  anthropic: AIProviderConfig & { model: AnthropicModel };
  google: AIProviderConfig & { model: GoogleModel };
  temperature: number;
  maxTokens: number;
};

// ==================== Coupang Category ====================

export type CoupangCategory = {
  id: string;
  name: string;
  enabled: boolean;
};

// 쿠팡 카테고리 상수 (쿠팡 API 문서 기준)
export const COUPANG_CATEGORIES: CoupangCategory[] = [
  { id: "1001", name: "여성패션", enabled: false },
  { id: "1002", name: "남성패션", enabled: false },
  { id: "1010", name: "뷰티", enabled: false },
  { id: "1011", name: "출산/유아동", enabled: false },
  { id: "1012", name: "식품", enabled: false },
  { id: "1013", name: "주방용품", enabled: false },
  { id: "1014", name: "생활용품", enabled: false },
  { id: "1015", name: "홈인테리어", enabled: false },
  { id: "1016", name: "가전디지털", enabled: false },
  { id: "1017", name: "스포츠/레저", enabled: false },
  { id: "1018", name: "자동차용품", enabled: false },
  { id: "1019", name: "도서/음반/DVD", enabled: false },
  { id: "1020", name: "완구/취미", enabled: false },
  { id: "1021", name: "문구/오피스", enabled: false },
  { id: "1024", name: "헬스/건강식품", enabled: false },
  { id: "1029", name: "반려동물용품", enabled: false },
  { id: "1030", name: "유아동패션", enabled: false },
];

// ==================== Automation ====================

export type AutomationSettings = {
  enabled: boolean;
  collectSchedule: string; // "HH:mm" 형식
  maxProductsPerRun: number;
  reviewGeneration: {
    enabled: boolean;
    maxPerRun: number;
    schedule: string; // "HH:mm" 형식 (표시/관리용)
    pauseWhenDraftCountExceeds: number;
  };
  newsGeneration: {
    enabled: boolean;
    morningSchedule: string; // "HH:mm"
    afternoonSchedule: string; // "HH:mm"
  };
};

// ==================== Topics ====================

export type CoupangPLBrand = {
  id: string; // "1001", "1002", etc.
  name: string; // "탐사", "코멧", etc.
};

export const COUPANG_PL_BRANDS: CoupangPLBrand[] = [
  { id: "1001", name: "탐사" },
  { id: "1002", name: "코멧" },
  { id: "1003", name: "Gomgom" },
  { id: "1004", name: "줌" },
  { id: "1006", name: "곰곰" },
  { id: "1007", name: "꼬리별" },
  { id: "1008", name: "베이스알파에센셜" },
  { id: "1010", name: "비타할로" },
  { id: "1011", name: "비지엔젤" },
];

export type TopicSettings = {
  categories: CoupangCategory[];
  keywords: string[];
  goldboxEnabled: boolean; // 골드박스 수집 활성화
  coupangPLBrands: string[]; // 쿠팡 PL 브랜드 ID 배열
};

// ==================== Prompt ====================

export type PromptSettings = {
  systemPrompt: string;
  reviewTemplate: string;
  additionalGuidelines: string; // 상세 작성 가이드라인
  minLength: number;
  maxLength: number;
  toneScoreThreshold: number;
};

// ==================== Image Settings ====================

export type StockImageProvider = "unsplash" | "pexels";
export type AIImageProvider = "dalle" | "stable-diffusion";

export type ImageSettings = {
  // 1단계: 스톡 이미지
  stockImages: {
    enabled: boolean;
    provider: StockImageProvider;
    apiKey?: string; // 레거시 단일 키 (호환용)
    apiKeys: {
      unsplash: string;
      pexels: string;
    };
    count: number; // 추가할 이미지 개수
  };

  // 2단계: AI 이미지 생성
  aiImages: {
    enabled: boolean;
    provider: AIImageProvider;
    count: number;
    quality: "standard" | "hd"; // DALL-E 품질
  };

  // 3단계: 쿠팡 상세 이미지
  coupangDetailImages: {
    enabled: boolean;
    maxCount: number; // 최대 가져올 개수
    delayMs: number; // Rate limiting (밀리초)
  };
};

// ==================== Coupang API ====================

export type CoupangAPISettings = {
  enabled: boolean;
  accessKey: string;
  secretKey: string;
  partnerId: string;
  subId: string;
};

// ==================== System Settings ====================

export type SystemSettings = {
  automation: AutomationSettings;
  topics: TopicSettings;
  ai: AISettings;
  prompt: PromptSettings;
  images: ImageSettings;
  coupang: CoupangAPISettings;
  updatedAt?: string;
  updatedBy?: string;
};

// ==================== Default Values ====================

export const DEFAULT_SYSTEM_PROMPT = `당신은 제공된 상품 정보만으로 구매 판단을 돕는 상품 선택 가이드 작성자입니다.

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
- 자연스러운 단락 구분만 사용 (빈 줄로 단락 나눔)`;

export const DEFAULT_REVIEW_TEMPLATE = `{productName} ({category}) 상품을 검토하는 사람을 위한 사실 기반 선택 가이드를 작성해주세요.

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
- 첫 문장은 상품 선택에 필요한 핵심 기준으로 바로 시작 (제목·인사·라벨 없이)`;

/** 권장 선택 가이드 분량 — 구매 판단에 필요한 비교 기준을 충분히 설명 */
export const RECOMMENDED_REVIEW_LENGTH = {
  minLength: 800,
  maxLength: 1200,
};

export const DEFAULT_ADDITIONAL_GUIDELINES = ``;

export const DEFAULT_SETTINGS: SystemSettings = {
  automation: {
    enabled: false,
    collectSchedule: "02:00",
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
  topics: {
    categories: COUPANG_CATEGORIES,
    keywords: [],
    goldboxEnabled: true,
    coupangPLBrands: [],
  },
  ai: {
    defaultProvider: "openai",
    openai: {
      apiKey: "",
      model: "gpt-4o-mini",
    },
    anthropic: {
      apiKey: "",
      model: "claude-3-5-sonnet-20241022",
    },
    google: {
      apiKey: "",
      model: "gemini-1.5-flash",
    },
    temperature: 0.7,
    maxTokens: 1024,
  },
  prompt: {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    reviewTemplate: DEFAULT_REVIEW_TEMPLATE,
    additionalGuidelines: DEFAULT_ADDITIONAL_GUIDELINES,
    minLength: RECOMMENDED_REVIEW_LENGTH.minLength,
    maxLength: RECOMMENDED_REVIEW_LENGTH.maxLength,
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
      count: 3,
    },
    aiImages: {
      enabled: false,
      provider: "dalle",
      count: 2,
      quality: "standard",
    },
    coupangDetailImages: {
      enabled: false,
      maxCount: 5,
      delayMs: 2000,
    },
  },
  coupang: {
    enabled: false,
    accessKey: "",
    secretKey: "",
    partnerId: "",
    subId: "",
  },
};

// ==================== Update Input Types ====================

export type AutomationSettingsInput = Partial<AutomationSettings>;
export type TopicSettingsInput = Partial<TopicSettings>;
export type AISettingsInput = Partial<AISettings>;
export type PromptSettingsInput = Partial<PromptSettings>;
export type ImageSettingsInput = Partial<ImageSettings>;
export type CoupangAPISettingsInput = Partial<CoupangAPISettings>;
export type SystemSettingsInput = Partial<SystemSettings>;

// ==================== API Response Types ====================

export type CoupangConnectionTestResult = {
  success: boolean;
  message: string;
  apiEnabled?: boolean;
};

export type SettingsSaveResult = {
  success: boolean;
  message: string;
  updatedAt?: string;
};

// ==================== Coupang Report Types ====================

export type ReportType = "clicks" | "orders" | "cancels" | "commission";

// 쿠팡 API 원본 응답 타입
export type CoupangClickResponse = {
  date: string;
  trackingCode: string;
  subId: string;
  addtag?: string;
  ctag?: string;
  click: number; // 단수형!
};

export type CoupangOrderResponse = {
  date: string;
  trackingCode: string;
  subId: string;
  subParam?: string;
  addtag?: string;
  ctag?: string;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  gmv: number;
  commissionRate: number;
  commission: number;
  categoryName: string;
};

export type CoupangCancelResponse = {
  date: string;
  trackingCode: string;
  subId: string;
  orderId: number;
  productId: number;
  cancelGmv: number;
};

export type CoupangCommissionResponse = {
  date: string;
  trackingCode: string;
  subId: string;
  commission: number;
  gmv: number;
  order: number; // 이 날짜의 총 주문 수
  click: number; // 이 날짜의 총 클릭 수
};

// 프론트엔드에서 사용하는 집계된 타입
export type ClickReportItem = {
  date: string;
  clicks: number; // 날짜별 합계
  subId?: string;
};

export type OrderReportItem = {
  date: string;
  orderCnt: number; // 날짜별 주문 건수
  quantity: number; // 날짜별 총 수량
  gmv: number; // 날짜별 총 GMV
  subId?: string;
};

export type CancelReportItem = {
  date: string;
  cancelCnt: number; // 날짜별 취소 건수
  cancelGmv: number; // 날짜별 취소 GMV
  subId?: string;
};

export type CommissionReportItem = {
  date: string;
  commission: number;
  gmv: number;
  orders: number; // 주문 수
  clicks: number; // 클릭 수
  subId?: string;
};

export type ReportData = {
  clicks: ClickReportItem[];
  orders: OrderReportItem[];
  cancels: CancelReportItem[];
  commission: CommissionReportItem[];
};

export type ReportSummary = {
  totalClicks: number;
  totalOrders: number;
  totalGmv: number;
  totalCommission: number;
  totalCancels: number;
  period: {
    startDate: string;
    endDate: string;
  };
};

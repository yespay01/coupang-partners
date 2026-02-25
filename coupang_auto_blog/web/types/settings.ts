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
    apiKey: string;
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

export const DEFAULT_SYSTEM_PROMPT = `당신은 네이버 상위 블로거처럼 자연스럽고 생생한 상품 리뷰를 쓰는 작성자입니다.

핵심 원칙:
- 광고/홍보 느낌이 아닌, 실제 사용해본 사람의 솔직한 후기처럼 쓰기
- 짧고 리듬감 있는 문장 (한 문단 2~3문장)
- 카테고리에 맞는 말투 사용:
  • 식품/건강: 친근한 구어체 (~더라고요, ~해보니까)
  • 뷰티/패션: 감성적 묘사 (촉촉하게, 핏이 예뻐서)
  • 생활용품: 실용 정보 중심 (세게 눌러도, 빨리 마르고)
  • IT/전자: 간결한 기능 중심 (반응이 빠르고, 연결이 잘 돼서)
- 마크다운, 별표(*), 특수문자 사용 금지
- 자연스러운 단락 구분만 사용`;

export const DEFAULT_REVIEW_TEMPLATE = `{productName} ({category}) 사용 후기를 솔직하게 작성해주세요.

아래 흐름으로 {minLength}~{maxLength}자 분량으로 작성하세요:

1. 구매 계기: 왜 이 상품을 찾게 됐는지 1~2문장 (개인적인 상황이나 필요에서 시작)
2. 실제 사용 느낌: 사용했을 때의 구체적인 감각과 경험 2~3문장
3. 솔직한 평가: 좋은 점 1~2가지, 아쉬운 점 1가지
4. 마무리: 어떤 분께 추천하는지 한 문장

규칙:
- 구어체로 자연스럽게 (~더라고요, ~해서 좋았어요, ~인 것 같아요)
- 광고성 문구 절대 금지 (최고의, 강력 추천, 혁신적인, 놀라운)
- 과장 표현 금지 (100%, 완벽한, 최강)
- 마크다운 서식 금지 (별표, 샵, 대시로 꾸미지 말 것)`;

export const DEFAULT_ADDITIONAL_GUIDELINES = ``;

export const DEFAULT_SETTINGS: SystemSettings = {
  automation: {
    enabled: false,
    collectSchedule: "02:00",
    maxProductsPerRun: 10,
    reviewGeneration: {
      enabled: false,
      maxPerRun: 5,
      schedule: "03:00",
      pauseWhenDraftCountExceeds: 50,
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
    minLength: 400,
    maxLength: 600,
    toneScoreThreshold: 0.4,
  },
  images: {
    stockImages: {
      enabled: false,
      provider: "unsplash",
      apiKey: "",
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

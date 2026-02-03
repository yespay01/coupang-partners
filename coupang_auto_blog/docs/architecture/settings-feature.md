# 시스템 설정 기능 설계 문서

## 개요

관리자 대시보드에서 시스템 설정을 관리할 수 있는 기능입니다.
자동 수집, AI 모델, 프롬프트, 쿠팡 API 연동 등을 설정할 수 있습니다.

## 기능 목록

### 1. 자동 수집 설정
- 자동 수집 ON/OFF 토글
- 수집 스케줄 설정 (시간)
- 1회 최대 수집 상품 수

### 2. 주제 설정
- 수집할 카테고리 선택 (다중)
- 수집 키워드 관리 (태그 입력)

### 3. AI 설정 (다중 제공자 지원)
- **OpenAI**: gpt-4o-mini, gpt-4o, gpt-4-turbo
- **Anthropic (Claude)**: claude-3-5-sonnet, claude-3-opus, claude-3-5-haiku
- **Google (Gemini)**: gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash
- 기본 AI 제공자 선택
- Temperature 조절 (0.0 ~ 2.0)
- Max Tokens 설정

### 4. 프롬프트 설정
- 시스템 프롬프트 편집
- 리뷰 템플릿 편집 (변수: {productName}, {category}, {minLength}, {maxLength})
- 최소/최대 글자 수
- 톤 점수 임계값

### 5. 쿠팡 API 연동
- Access Key / Secret Key 입력
- Partner ID / Sub ID 설정
- 연결 테스트 버튼
- 활성화 토글

## Firestore 스키마

### `system_settings/global` 문서

```typescript
interface SystemSettings {
  automation: {
    enabled: boolean;
    collectSchedule: string;       // "HH:mm" 형식
    maxProductsPerRun: number;
  };
  topics: {
    categories: CoupangCategory[];
    keywords: string[];
  };
  ai: {
    defaultProvider: "openai" | "anthropic" | "google";
    openai: { apiKey: string; model: string; };
    anthropic: { apiKey: string; model: string; };
    google: { apiKey: string; model: string; };
    temperature: number;
    maxTokens: number;
  };
  prompt: {
    systemPrompt: string;
    reviewTemplate: string;
    minLength: number;
    maxLength: number;
    toneScoreThreshold: number;
  };
  coupang: {
    enabled: boolean;
    accessKey: string;
    secretKey: string;
    partnerId: string;
    subId: string;
  };
  updatedAt: Timestamp;
  updatedBy: string;
}
```

## 파일 구조

### 웹 프론트엔드

```
web/
├── types/
│   └── settings.ts              # 설정 타입 정의
├── lib/
│   └── settingsService.ts       # Firestore 설정 CRUD
├── stores/
│   └── settingsStore.ts         # Zustand 스토어
├── hooks/
│   └── useSystemSettings.ts     # 설정 조회/수정 훅
├── app/
│   ├── (dashboard)/admin/settings/
│   │   └── page.tsx             # 설정 페이지
│   └── api/settings/
│       ├── route.ts             # 설정 API
│       └── coupang/test/
│           └── route.ts         # 쿠팡 연결 테스트 API
└── components/admin/settings/
    ├── SettingsView.tsx         # 메인 뷰
    ├── AutomationSettings.tsx   # 자동화 설정
    ├── TopicSettings.tsx        # 주제 설정
    ├── AISettings.tsx           # AI 설정
    ├── PromptSettings.tsx       # 프롬프트 설정
    ├── CoupangSettings.tsx      # 쿠팡 API 설정
    └── index.ts                 # export
```

### Firebase Functions

```
functions/src/
├── aiProviders.js               # 다중 AI 제공자 클라이언트
├── coupangApi.js                # 쿠팡 파트너스 API 클라이언트
├── collectProducts.js           # 상품 자동 수집 스케줄러
├── generateReview.js            # AI 리뷰 생성 (설정 기반)
└── reviewUtils.js               # 프롬프트 빌더, 검증 (설정 기반)
```

## 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                        관리자 대시보드                            │
│                      /admin/settings                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     useSystemSettings                           │
│              (React Query + Zustand Store)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    settingsService.ts                           │
│                  (Firestore CRUD 서비스)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Firestore: system_settings/global                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│   generateReview.js   │       │  collectProducts.js   │
│   (리뷰 생성 시 설정 로드)│       │  (상품 수집 시 설정 로드)│
└───────────────────────┘       └───────────────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│   aiProviders.js      │       │   coupangApi.js       │
│   (다중 AI 호출)       │       │   (쿠팡 API 호출)      │
└───────────────────────┘       └───────────────────────┘
```

## 보안 고려사항

1. **API 키 관리**: Firestore에 저장되는 API 키는 클라이언트에서 직접 접근 가능하므로, 프로덕션 환경에서는 서버 사이드에서만 사용하도록 개선 필요
2. **Firestore 규칙**: `system_settings` 컬렉션은 관리자만 읽기/쓰기 가능하도록 규칙 설정
3. **입력 검증**: 모든 설정 입력값에 대한 클라이언트/서버 양측 검증

## 쿠팡 파트너스 API

### 사용 가능한 API
1. **검색 API**: 키워드로 상품 검색 (1시간당 최대 10회)
2. **베스트 상품 API**: 카테고리별 100개 추천 상품
3. **딥링크 API**: 제휴 링크 자동 생성
4. **카테고리 추천 API**: 상품명으로 카테고리 추천

### API 활성화 조건
- 판매 총 금액 15만원 이상

### HMAC 서명
쿠팡 API는 HMAC-SHA256 서명이 필요합니다:
```
signature = HMAC-SHA256(secretKey, datetime + method + url)
Authorization: CEA algorithm=HmacSHA256, access-key=..., signed-date=..., signature=...
```

## 테스트 방법

1. **설정 페이지 접근**: `/admin/settings` 접속
2. **설정 저장**: 각 섹션 설정 변경 후 "변경사항 저장" 클릭
3. **AI 설정 적용**: 모델 변경 후 리뷰 생성 → 로그에서 사용된 모델 확인
4. **쿠팡 API**: "연결 테스트" 버튼으로 API 연동 확인

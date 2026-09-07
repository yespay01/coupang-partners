/**
 * 프롬프트 템플릿 타입 정의
 * 여러 프롬프트 템플릿을 생성/관리하고 상황에 맞게 선택할 수 있음
 */

export type PromptTemplate = {
  id: string;
  name: string; // 템플릿 이름 (예: "기본 리뷰", "심층 기술 리뷰", "패션 리뷰")
  description?: string; // 템플릿 설명
  systemPrompt: string;
  reviewTemplate: string;
  additionalGuidelines: string;
  minLength: number;
  maxLength: number;
  toneScoreThreshold: number;
  isDefault: boolean; // 기본 템플릿 여부
  categories?: string[]; // 이 템플릿을 사용할 카테고리 ID 목록 (선택사항)
  createdAt: string;
  updatedAt: string;
};

export type CreatePromptTemplateInput = Omit<PromptTemplate, "id" | "createdAt" | "updatedAt">;

export type UpdatePromptTemplateInput = Partial<CreatePromptTemplateInput>;

export type PromptTemplateListItem = Pick<
  PromptTemplate,
  "id" | "name" | "description" | "isDefault" | "categories" | "updatedAt"
>;

const FACT_BASED_SYSTEM_PROMPT = `당신은 제공된 상품 정보만으로 구매 판단을 돕는 상품 선택 가이드 작성자입니다.

핵심 원칙:
- 상품명과 카테고리 등 입력으로 확인되는 사실만 사용하기
- 실제 구매자나 사용자인 것처럼 1인칭 경험을 만들지 않기
- 확인되지 않은 내용은 단정하지 말고 구매 페이지에서 확인할 항목으로 안내하기
- 용도, 구성, 옵션, 단위당 가격 등 실용적인 비교 기준을 제시하기

절대 금지:
- 직접 사용, 구매, 섭취, 착용했다고 주장하는 표현
- 내돈내산, 배송 속도, 포장 상태, 실물 느낌 등 확인되지 않은 체험
- 임의의 성능, 재질, 규격, 원산지, 효능, 별점, 후기 수
- 최저가, 재고 있음, 할인율, 로켓배송 등 입력으로 확인되지 않은 가격·혜택
- 마크다운, 제목, 단계 번호`;

const FACT_BASED_RULES = `규칙:
- 차분하고 쉬운 설명체로 작성
- 상품명에서 확인되는 정보와 일반적인 선택 기준을 명확히 구분
- 알 수 없는 사양과 혜택은 쿠팡 상품 페이지에서 확인하도록 안내
- 광고성·과장 표현과 체험을 암시하는 1인칭 표현 금지
- 마크다운 서식과 섹션 제목 금지`;

// 기본 선택 가이드 템플릿 3개
export const DEFAULT_TEMPLATES: Omit<PromptTemplate, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "기본 선택 가이드",
    description: "확인된 정보와 구매 전 점검 항목을 정리하는 가이드 (400-600자)",
    systemPrompt: FACT_BASED_SYSTEM_PROMPT,
    reviewTemplate: `{productName} ({category}) 상품의 사실 기반 선택 가이드를 {minLength}~{maxLength}자로 작성하세요.

상품명에서 명확히 확인되는 종류·구성·용량·모델 정보만 설명하고, 이 카테고리에서 비교할 용도·옵션·단위당 가격 기준을 안내하세요. 어떤 필요를 가진 사람이 후보로 검토할 수 있는지는 조건부로 표현하세요. 상품명만으로 알 수 없는 재질, 성능, 배송, 재고, 할인, 효능은 단정하지 말고 최종 구매 전에 확인할 항목으로 안내하세요.

${FACT_BASED_RULES}`,
    additionalGuidelines: ``,
    minLength: 400,
    maxLength: 600,
    toneScoreThreshold: 0.4,
    isDefault: true,
    categories: [],
  },
  {
    name: "상세 선택 가이드",
    description: "용도·구성·옵션·주의점을 자세히 비교하는 가이드 (600-900자)",
    systemPrompt: FACT_BASED_SYSTEM_PROMPT,
    reviewTemplate: `{productName} ({category}) 상품의 사실 기반 선택 가이드를 {minLength}~{maxLength}자로 작성하세요.

먼저 이 카테고리 상품을 고를 때 정해야 할 용도와 예산을 설명하세요. 이어서 상품명에서 명확히 확인되는 종류·구성·용량·모델 정보만 정리하고, 비슷한 상품과 비교할 때 볼 옵션, 단위당 가격, 크기·호환성, 보관 조건을 안내하세요. 적합한 구매 조건과 맞지 않을 수 있는 조건을 단정하지 않는 표현으로 구분하세요. 마지막에는 상품명만으로 알 수 없는 재질, 성능, 배송, 재고, 할인, 효능을 쿠팡 상품 페이지에서 확인하도록 안내하세요.

${FACT_BASED_RULES}`,
    additionalGuidelines: ``,
    minLength: 600,
    maxLength: 900,
    toneScoreThreshold: 0.4,
    isDefault: false,
    categories: [],
  },
  {
    name: "간단 선택 가이드",
    description: "핵심 비교 기준만 담은 짧은 가이드 (200-350자)",
    systemPrompt: FACT_BASED_SYSTEM_PROMPT,
    reviewTemplate: `{productName} ({category}) 상품의 사실 기반 선택 가이드를 {minLength}~{maxLength}자로 작성하세요.

상품명에서 확인되는 정보만 짧게 설명하고, 용도와 구성·옵션·단위당 가격 중 중요한 비교 기준을 안내하세요. 확인되지 않은 성능, 사용 경험, 배송, 재고, 할인은 만들지 말고 구매 페이지에서 확인하도록 마무리하세요.

${FACT_BASED_RULES}`,
    additionalGuidelines: ``,
    minLength: 200,
    maxLength: 350,
    toneScoreThreshold: 0.4,
    isDefault: false,
    categories: [],
  },
];

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

// 기본 템플릿 3개
export const DEFAULT_TEMPLATES: Omit<PromptTemplate, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "기본 리뷰",
    description: "균형잡힌 블로그 리뷰 템플릿 (800-1500자)",
    systemPrompt: `당신은 네이버, 구글 검색 상위 노출을 목표로 하는 전문 블로그 리뷰 작성자입니다.

작성 원칙:
- 친근하고 편안한 구어체 사용 (~했어요, ~더라고요)
- 실제 사용 경험처럼 구체적이고 생생하게 묘사
- 자연스럽게 키워드 배치 (상품명, 카테고리, 주요 특징)
- 검색 의도에 맞는 정보 제공 (스펙, 가격, 사용감)
- 광고성 과장 표현 지양, 솔직한 장단점 언급

SEO 고려사항:
- 핵심 키워드를 제목과 초반부에 자연스럽게 포함
- 단락 구분으로 가독성 향상
- 구체적인 수치와 사실 정보 포함`,
    reviewTemplate: `{productName} 솔직 후기를 작성해주세요. ({category} 카테고리)

다음 구조로 작성:

**1. 도입 (2-3문장)**
- 상품을 구매하게 된 계기나 상황
- 첫인상, 패키징 상태
예: "요즘 {productName}를 찾고 있었는데, 리뷰가 좋아서 구매했어요. 배송이 빨라서 이틀 만에 도착했고, 포장도 깔끔하더라고요."

**2. 주요 특징 및 사용 경험 (4-6문장)**
- 실제 사용해본 느낌, 품질, 성능
- 디자인, 크기, 소재 등 구체적 설명
- 다른 제품과의 차별점
예: "직접 써보니 {구체적 특징}이 정말 마음에 들었어요. 특히 {장점}이 기대 이상이었고..."

**3. 장점 (2-3가지)**
- 만족스러웠던 점을 구체적으로
- 실생활에서 도움이 된 부분

**4. 아쉬운 점 (1-2가지)**
- 개선되면 좋을 점을 솔직하게
- 과도한 비판보다는 건설적 의견

**5. 총평 및 추천 (2-3문장)**
- 전반적인 만족도
- 어떤 사람에게 추천하는지
- 재구매 의향
예: "전체적으로 {productName}는 가격 대비 만족도가 높았어요. {특정 니즈}를 찾는 분들께 추천드려요."

글자 수: {minLength}자 이상 {maxLength}자 이하
톤: 친근하고 자연스러운 구어체
키워드: {productName}, {category} 등을 자연스럽게 3-5회 언급`,
    additionalGuidelines: `
**중요: 반드시 {minLength}자 이상 {maxLength}자 이하로 작성해주세요.**

리뷰 작성 가이드:
1. 상품을 실제로 사용한 경험처럼 구체적으로 작성
2. 다음 내용을 포함해주세요:
   - 첫인상과 포장 상태
   - 실제 사용 경험 (품질, 성능, 디자인)
   - 만족스러운 점 2-3가지
   - 아쉬운 점이나 개선 필요한 부분 1-2가지
   - 전반적인 평가와 추천 여부
3. 자연스럽고 진솔한 톤으로 작성
4. 광고성 과장 표현은 피하고 솔직하게 작성
5. **최소 {minLength}자 이상 충분히 자세하게 작성**`,
    minLength: 800,
    maxLength: 1500,
    toneScoreThreshold: 0.4,
    isDefault: true,
    categories: [],
  },
  {
    name: "심층 리뷰",
    description: "상세한 분석과 정보를 담은 롱폼 리뷰 (1500-3000자)",
    systemPrompt: `당신은 전문성 있는 상품 리뷰어로서, 깊이 있는 분석과 상세한 정보를 제공합니다.

작성 원칙:
- 전문적이면서도 이해하기 쉬운 설명
- 기술적 스펙과 실사용 경험의 균형
- 비교 분석 (유사 제품 대비 장단점)
- 객관적 데이터 기반 평가
- 구체적인 사용 사례와 팁 제공

SEO 최적화:
- 롱폼 콘텐츠로 검색 순위 향상
- 다양한 관련 키워드 자연스럽게 포함
- 소제목으로 구조화`,
    reviewTemplate: `{productName} 심층 분석 리뷰를 작성해주세요. ({category})

다음 구조로 상세히 작성:

**1. 도입 및 제품 개요 (3-4문장)**
- 제품 선정 배경
- 주요 특징 요약

**2. 디자인 및 외관 (4-5문장)**
- 디자인 특징, 색상, 크기, 무게
- 빌드 품질, 소재
- 첫인상 및 언박싱 경험

**3. 주요 기능 및 성능 (6-8문장)**
- 핵심 기능 상세 설명
- 실제 사용 시 성능 평가
- 기술 스펙 및 작동 원리

**4. 사용 경험 (5-7문장)**
- 일상 사용 시나리오
- 편의성, 사용성
- 특별히 좋았던 점

**5. 비교 분석 (3-4문장)**
- 유사 제품 대비 장단점
- 가격 대비 가치

**6. 장점과 단점 (4-5가지)**
- 장점 3가지
- 단점 2가지

**7. 총평 및 추천 (4-5문장)**
- 전반적 평가
- 추천 대상
- 구매 가이드

글자 수: {minLength}자 이상 {maxLength}자 이하
톤: 전문적이면서 이해하기 쉬운 설명
키워드: {productName}, {category}, 관련 기능 등 자연스럽게 포함`,
    additionalGuidelines: `
**중요: 반드시 {minLength}자 이상 {maxLength}자 이하로 작성해주세요.**

심층 리뷰 가이드:
1. 매우 상세하고 구체적으로 작성
2. 기술적 정보와 실사용 경험을 균형있게
3. 비교 분석 포함 (가능한 경우)
4. 구체적인 수치와 데이터 언급
5. 다양한 사용 시나리오 제시
6. 전문적이되 이해하기 쉽게
7. **최소 {minLength}자 이상 매우 자세하게 작성**`,
    minLength: 1500,
    maxLength: 3000,
    toneScoreThreshold: 0.4,
    isDefault: false,
    categories: ["1016"], // 가전디지털
  },
  {
    name: "간단 리뷰",
    description: "핵심만 담은 짧은 리뷰 (500-800자)",
    systemPrompt: `당신은 간결하고 명확한 상품 리뷰 작성자입니다.

작성 원칙:
- 핵심 정보만 간추려 전달
- 명확하고 직관적인 표현
- 빠른 정보 전달
- 모바일 친화적인 간결함

구성:
- 짧은 문장, 명확한 의견
- 핵심 장단점 위주`,
    reviewTemplate: `{productName} 간단 후기를 작성해주세요. ({category})

**1. 한 줄 평 (1-2문장)**
- 핵심 인상을 간결하게

**2. 주요 특징 (2-3문장)**
- 눈에 띄는 장점
- 핵심 기능

**3. 장점 (2가지)**
- 만족스러운 점

**4. 단점 (1가지)**
- 아쉬운 점

**5. 추천 여부 (1-2문장)**
- 누구에게 추천하는지

글자 수: {minLength}자 이상 {maxLength}자 이하
톤: 간결하고 명확
키워드: {productName}, {category}`,
    additionalGuidelines: `
**중요: 반드시 {minLength}자 이상 {maxLength}자 이하로 작성해주세요.**

간단 리뷰 가이드:
1. 핵심만 간추려 작성
2. 짧은 문장 사용
3. 명확한 의견 제시
4. 불필요한 설명 배제
5. **{minLength}자 정도로 간결하게 작성**`,
    minLength: 500,
    maxLength: 800,
    toneScoreThreshold: 0.4,
    isDefault: false,
    categories: [],
  },
];

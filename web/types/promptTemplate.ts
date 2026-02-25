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
    description: "상위 블로거 스타일의 자연스러운 리뷰 (400-600자)",
    systemPrompt: `당신은 네이버 상위 블로거처럼 자연스럽고 생생한 상품 리뷰를 쓰는 작성자입니다.

핵심 원칙:
- 광고/홍보 느낌이 아닌, 실제 사용해본 사람의 솔직한 후기처럼 쓰기
- 짧고 리듬감 있는 문장 (한 문단 2~3문장)
- 카테고리에 맞는 말투 사용:
  • 식품/건강: 친근한 구어체 (~더라고요, ~해보니까)
  • 뷰티/패션: 감성적 묘사 (촉촉하게, 핏이 예뻐서)
  • 생활용품: 실용 정보 중심 (세게 눌러도, 빨리 마르고)
  • IT/전자: 간결한 기능 중심 (반응이 빠르고, 연결이 잘 돼서)
- 마크다운, 별표(*), 특수문자 사용 금지
- 자연스러운 단락 구분만 사용`,
    reviewTemplate: `{productName} ({category}) 사용 후기를 솔직하게 작성해주세요.

아래 흐름으로 {minLength}~{maxLength}자 분량으로 작성하세요:

1. 구매 계기: 왜 이 상품을 찾게 됐는지 1~2문장 (개인적인 상황이나 필요에서 시작)
2. 실제 사용 느낌: 사용했을 때의 구체적인 감각과 경험 2~3문장
3. 솔직한 평가: 좋은 점 1~2가지, 아쉬운 점 1가지
4. 마무리: 어떤 분께 추천하는지 한 문장

규칙:
- 구어체로 자연스럽게 (~더라고요, ~해서 좋았어요, ~인 것 같아요)
- 광고성 문구 절대 금지 (최고의, 강력 추천, 혁신적인, 놀라운)
- 과장 표현 금지 (100%, 완벽한, 최강)
- 마크다운 서식 금지 (별표, 샵, 대시로 꾸미지 말 것)`,
    additionalGuidelines: ``,
    minLength: 400,
    maxLength: 600,
    toneScoreThreshold: 0.4,
    isDefault: true,
    categories: [],
  },
  {
    name: "상세 리뷰",
    description: "사용 경험을 자세하게 풀어쓴 리뷰 (600-900자)",
    systemPrompt: `당신은 네이버 상위 블로거처럼 자연스럽고 생생한 상품 리뷰를 쓰는 작성자입니다.

핵심 원칙:
- 광고/홍보 느낌이 아닌, 실제 사용해본 사람의 솔직한 후기처럼 쓰기
- 짧고 리듬감 있는 문장 (한 문단 2~3문장)
- 카테고리에 맞는 말투 사용:
  • 식품/건강: 친근한 구어체 (~더라고요, ~해보니까)
  • 뷰티/패션: 감성적 묘사 (촉촉하게, 핏이 예뻐서)
  • 생활용품: 실용 정보 중심 (세게 눌러도, 빨리 마르고)
  • IT/전자: 간결한 기능 중심 (반응이 빠르고, 연결이 잘 돼서)
- 마크다운, 별표(*), 특수문자 사용 금지
- 자연스러운 단락 구분만 사용`,
    reviewTemplate: `{productName} ({category}) 사용 후기를 솔직하게 작성해주세요.

아래 흐름으로 {minLength}~{maxLength}자 분량으로 작성하세요:

1. 구매 계기: 왜 이 상품을 찾게 됐는지, 어떤 상황에서 필요했는지 2~3문장
2. 첫인상: 받았을 때 느낌, 포장, 외관 1~2문장
3. 실제 사용 느낌: 사용했을 때의 구체적인 감각과 경험 3~4문장
4. 솔직한 평가: 좋은 점 2가지, 아쉬운 점 1가지
5. 마무리: 전체적인 만족도와 추천 대상 1~2문장

규칙:
- 구어체로 자연스럽게 (~더라고요, ~해서 좋았어요, ~인 것 같아요)
- 광고성 문구 절대 금지 (최고의, 강력 추천, 혁신적인, 놀라운)
- 과장 표현 금지 (100%, 완벽한, 최강)
- 마크다운 서식 금지 (별표, 샵, 대시로 꾸미지 말 것)`,
    additionalGuidelines: ``,
    minLength: 600,
    maxLength: 900,
    toneScoreThreshold: 0.4,
    isDefault: false,
    categories: [],
  },
  {
    name: "간단 리뷰",
    description: "핵심만 담은 짧은 리뷰 (200-350자)",
    systemPrompt: `당신은 쿠팡 상품 후기처럼 간결하고 솔직하게 쓰는 리뷰 작성자입니다.

핵심 원칙:
- 짧고 명확하게, 핵심만 전달
- 실제 사용자처럼 자연스러운 구어체
- 마크다운, 별표(*), 특수문자 사용 금지`,
    reviewTemplate: `{productName} ({category}) 짧은 후기를 작성해주세요.

{minLength}~{maxLength}자로 간결하게:
- 어떤 상황에서 샀는지 한 문장
- 사용해보니 어떤지 1~2문장
- 좋은 점 하나, 아쉬운 점 하나
- 추천 여부 한 문장

구어체로 자연스럽게, 마크다운 서식 금지`,
    additionalGuidelines: ``,
    minLength: 200,
    maxLength: 350,
    toneScoreThreshold: 0.4,
    isDefault: false,
    categories: [],
  },
];

import { __constants as reviewValidationConstants } from './reviewUtils.js';

const EXPERIENCE_RULE_META = {
  PERSONAL_PURCHASE_CLAIM: { score: 40, label: '내돈내산 주장' },
  FIRST_PERSON_EXPERIENCE_CLAIM: { score: 30, label: '1인칭 구매·사용 경험 주장' },
  DIRECT_EXPERIENCE_CLAIM: { score: 30, label: '직접 구매·사용 경험 주장' },
  OBSERVED_USE_CLAIM: { score: 25, label: '사용 후 관찰 경험 주장' },
  DELIVERY_EXPERIENCE_CLAIM: { score: 25, label: '배송 경험 주장' },
  PACKAGING_EXPERIENCE_CLAIM: { score: 25, label: '포장 경험 주장' },
};

const CLAIM_RULES = [
  {
    code: 'FIRST_PERSON_EXPERIENCE_BROAD',
    label: '광범위한 1인칭 체험 표현',
    score: 25,
    pattern: /(?:제가|저는|나는|우리는|우리\s*집)\s*.{0,40}(?:구매|주문|사용|써\s*보|먹어\s*보|입어\s*보|착용|설치|받아\s*보)(?:했|한|해|니|니까|는데|어요|습니다)/i,
    skipIfCodes: ['PERSONAL_PURCHASE_CLAIM', 'FIRST_PERSON_EXPERIENCE_CLAIM', 'DIRECT_EXPERIENCE_CLAIM', 'OBSERVED_USE_CLAIM'],
  },
  {
    code: 'DELIVERY_OR_PACKAGING_CLAIM',
    label: '배송·포장 상태 단정',
    score: 20,
    pattern: /(?:배송(?:이|은|도)?\s*(?:빠르|느리|정확|안전)|포장(?:이|은|도)?\s*(?:꼼꼼|깔끔|안전|튼튼|허술)|파손\s*없이\s*도착)/i,
    skipIfCodes: ['DELIVERY_EXPERIENCE_CLAIM', 'PACKAGING_EXPERIENCE_CLAIM'],
    allowVerificationContext: true,
  },
  {
    code: 'UNVERIFIED_USE_CLAIM',
    label: '사용·섭취·착용 경험 표현',
    score: 25,
    pattern: /(?:(?:며칠|일주일|한\s*달|오랫동안)\s*)?(?:사용|써|먹어|입어|착용)(?:해\s*)?(?:봤는데|보니까|해\s*봤|했더니)/i,
    skipIfCodes: ['FIRST_PERSON_EXPERIENCE_CLAIM', 'DIRECT_EXPERIENCE_CLAIM', 'OBSERVED_USE_CLAIM'],
    allowVerificationContext: true,
  },
  {
    code: 'LOWEST_PRICE_CLAIM',
    label: '근거 없는 최저가·가격 우위 주장',
    score: 30,
    pattern: /(?:최저가|가장\s*(?:싸|저렴)|제일\s*(?:싸|저렴)|타사보다\s*(?:싸|저렴)|어디보다\s*저렴)/i,
    allowVerificationContext: true,
  },
  {
    code: 'DISCOUNT_CLAIM',
    label: '근거 없는 할인·쿠폰 주장',
    score: 20,
    pattern: /(?:(?:지금|현재|오늘|이번\s*주).{0,12}(?:할인|세일|쿠폰)|\d{1,3}\s*%\s*(?:할인|세일)|(?:할인율|쿠폰)\s*(?:은|이|도)?\s*\d{1,3}|(?:할인|세일|쿠폰)(?:가|이|은|을|으로|된|중|적용|받))/i,
    allowVerificationContext: true,
  },
  {
    code: 'SHIPPING_BENEFIT_CLAIM',
    label: '확인되지 않은 배송 혜택 주장',
    score: 20,
    pattern: /(?:로켓배송|무료배송|당일배송|새벽배송)/i,
    allowVerificationContext: true,
  },
  {
    code: 'INVENTORY_CLAIM',
    label: '확인되지 않은 재고·품절 주장',
    score: 20,
    pattern: /(?:재고(?:가)?\s*(?:있|충분|얼마\s*안\s*남)|품절\s*(?:임박|직전|예정)|곧\s*품절)/i,
    allowVerificationContext: true,
  },
  {
    code: 'EFFICACY_CLAIM',
    label: '근거 없는 건강·효능 주장',
    score: 35,
    pattern: /(?:질병|염증|통증|아토피|혈당|혈압|콜레스테롤|불면|비만).{0,18}(?:치료|예방|개선|완화|낮춰|줄여|효과)|(?:치료|예방|완치|다이어트)\s*(?:에|효과|된다|됐|되었)|면역력\s*(?:강화|증진)|먹고\s*.{0,16}(?:나았|좋아졌|줄었)/i,
    allowVerificationContext: true,
  },
  {
    code: 'RATING_OR_REVIEW_COUNT_CLAIM',
    label: '출처 없는 별점·후기 수 주장',
    score: 20,
    pattern: /(?:별점|평점)\s*(?:은|이|도)?\s*[0-5](?:\.\d+)?|(?:후기|리뷰)\s*\d[\d,]*\s*개/i,
    allowVerificationContext: true,
  },
];

const DOMAIN_DEFINITIONS = [
  {
    id: 'food_beverage',
    label: '식품·음료',
    productTerms: ['삼다수', '생수', '음료', '주스', '커피', '탄산', '식품', '간식', '과자', '라면', '소스', '조미료', '맛술', '쌀'],
    bodyTerms: ['마시', '음용', '먹기', '맛이', '식감', '조리', '끓여', '요리', '간식'],
  },
  {
    id: 'storage_furniture',
    label: '수납·가구',
    productTerms: ['수납', '정리함', '서랍', '선반', '행거', '옷장', '소파', '의자', '테이블', '카운터', '가구', '바구니', '벤치'],
    bodyTerms: ['수납', '정리함', '서랍', '선반', '행거', '소파', '의자', '테이블', '가구', '바구니', '뚜껑', '공간 정리', '물건을 넣'],
  },
  {
    id: 'jewelry_care',
    label: '주얼리·귀금속 관리',
    productTerms: ['주얼리', '귀걸이', '목걸이', '반지', '귀금속', '보석', '은세척', '은 세척', '금 세척', '실버 클리너'],
    bodyTerms: ['주얼리', '귀걸이', '목걸이', '반지', '귀금속', '보석', '은제품', '광택', '변색'],
  },
  {
    id: 'clothing_care',
    label: '의류·보풀 관리',
    productTerms: ['보풀', '의류', '옷', '니트', '섬유', '재봉', '고무 밴드', '고무밴드'],
    bodyTerms: ['보풀', '의류', '옷감', '옷에', '니트', '섬유', '착용', '핏이', '소매'],
  },
  {
    id: 'cleaning_laundry',
    label: '청소·세탁',
    productTerms: ['세제', '세탁', '청소', '세정제', '표백제', '섬유유연제', '수세미'],
    bodyTerms: ['세제', '세탁', '빨래', '청소', '세척', '얼룩', '거품', '닦아', '표백'],
  },
  {
    id: 'beauty_personal',
    label: '뷰티·개인관리',
    productTerms: ['화장품', '샴푸', '린스', '트리트먼트', '크림', '로션', '에센스', '클렌저', '마스크팩', '립스틱'],
    bodyTerms: ['피부', '두피', '머릿결', '보습', '발림', '흡수', '세안', '메이크업', '촉촉'],
  },
  {
    id: 'electronics',
    label: '가전·전자',
    productTerms: ['이어폰', '헤드폰', '충전기', '케이블', '모니터', '스마트폰', '노트북', '가전', '배터리', '키보드', '마우스'],
    bodyTerms: ['충전', '연결', '배터리', '화면', '전원', '음질', '블루투스', '케이블', '작동'],
  },
  {
    id: 'pet',
    label: '반려동물',
    productTerms: ['반려동물', '강아지', '고양이', '사료', '배변패드', '고양이 모래', '펫'],
    bodyTerms: ['강아지', '고양이', '반려동물', '사료', '급여', '배변', '모래', '기호성'],
  },
  {
    id: 'baby_toy',
    label: '유아·완구',
    productTerms: ['장난감', '완구', '유아', '아기', '블록', '인형', '활동책'],
    bodyTerms: ['장난감', '완구', '아이', '아기', '유아', '놀이', '블록', '인형'],
  },
  {
    id: 'kitchen',
    label: '주방용품',
    productTerms: ['프라이팬', '냄비', '그릇', '주방', '도마', '식기', '텀블러', '조리도구'],
    bodyTerms: ['프라이팬', '냄비', '그릇', '주방', '도마', '식기', '설거지', '조리도구'],
  },
  {
    id: 'health_supplement',
    label: '건강·영양',
    productTerms: ['건강식품', '영양제', '비타민', '유산균', '홍삼', '보충제', '오메가'],
    bodyTerms: ['건강식품', '영양제', '비타민', '유산균', '홍삼', '보충제', '섭취'],
  },
];

const PRODUCT_STOP_WORDS = new Set([
  '정품', '공식', '신제품', '세트', '단품', '본품', '상품', '쿠팡', '추천', '특가', '할인',
  '무료배송', '로켓배송', '리뷰', '후기', '개입', '박스', '패키지', '옵션',
]);

function normalizeText(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function evidenceSnippet(text, index, length) {
  const start = Math.max(0, index - 36);
  const end = Math.min(text.length, index + length + 36);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

function findEvidence(text, pattern) {
  const flags = pattern.flags.replace(/g/g, '');
  const match = new RegExp(pattern.source, flags).exec(text);
  if (!match) return null;
  return {
    index: match.index,
    length: match[0].length,
    snippet: evidenceSnippet(text, match.index, match[0].length),
  };
}

function isVerificationContext(text, evidence) {
  const nearby = text.slice(
    Math.max(0, evidence.index - 28),
    Math.min(text.length, evidence.index + evidence.length + 40)
  );
  return /(?:(?:여부|인지|가능한지).{0,16}확인|확인(?:해\s*보|해야|하세요|하시기|할\s*(?:필요|수)|이\s*필요)|변동|알\s*수\s*없|단정할\s*수\s*없|상품\s*페이지에서.{0,20}확인)/i.test(nearby);
}

function findClaimEvidence(surfaces, pattern, allowVerificationContext = false) {
  for (const surface of surfaces) {
    const evidence = findEvidence(surface.text, pattern);
    if (!evidence) continue;
    if (allowVerificationContext && isVerificationContext(surface.text, evidence)) continue;
    return { ...evidence, snippet: `[${surface.label}] ${evidence.snippet}` };
  }
  return null;
}

function riskLevel(score) {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 20) return 'medium';
  if (score > 0) return 'low';
  return 'none';
}

function inferDomains(text, field) {
  const normalized = normalizeText(text).toLowerCase();
  return DOMAIN_DEFINITIONS.map((domain) => {
    const terms = field === 'product' ? domain.productTerms : domain.bodyTerms;
    const matchedTerms = terms.filter((term) => normalized.includes(term.toLowerCase()));
    return { id: domain.id, label: domain.label, score: matchedTerms.length, matchedTerms };
  })
    .filter((domain) => domain.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

function extractProductTerms(productName) {
  return normalizeText(productName)
    .toLowerCase()
    .replace(/[\[(（【].*?[\])）】]/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:개|개입|팩|세트|박스|ml|l|g|kg|mg|cm|mm|m|인치|회|매|장|병|캔|봉|포)\b/gi, ' ')
    .replace(/[^a-z0-9가-힣\s]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length >= 2 && !PRODUCT_STOP_WORDS.has(term) && !/^\d+$/.test(term));
}

function mismatchReasons(review, content) {
  const reasons = [];
  const productName = normalizeText(review.productName ?? review.product_name);
  const category = normalizeText(review.category ?? review.categoryName ?? review.category_name);
  if (!productName || !content) return reasons;

  const productTerms = extractProductTerms(productName);
  const mentionedTerms = productTerms.filter((term) => content.toLowerCase().includes(term));
  if (productTerms.length > 0 && mentionedTerms.length === 0) {
    reasons.push({
      code: 'PRODUCT_TERMS_MISSING',
      label: '본문에서 핵심 상품명 단어를 찾지 못함',
      score: 15,
      evidence: [`검사 상품명: ${productName}`],
    });
  }

  let bodyForDomain = content;
  bodyForDomain = bodyForDomain.replace(new RegExp(escapeRegExp(productName), 'gi'), ' ');
  const productDomains = inferDomains(`${productName} ${category}`, 'product');
  const bodyDomains = inferDomains(bodyForDomain, 'body');
  const strongestProductScore = productDomains[0]?.score ?? 0;
  const strongestBodyScore = bodyDomains[0]?.score ?? 0;
  const likelyProductDomains = productDomains
    .filter((domain) => domain.score === strongestProductScore)
    .map((domain) => domain.id);
  const likelyBodyDomains = bodyDomains
    .filter((domain) => domain.score === strongestBodyScore)
    .map((domain) => domain.id);
  const hasSharedDomain = likelyProductDomains.some((id) => likelyBodyDomains.includes(id));

  if (strongestProductScore > 0 && strongestBodyScore >= 2 && !hasSharedDomain) {
    reasons.push({
      code: 'PRODUCT_CONTENT_DOMAIN_MISMATCH',
      label: '상품과 본문의 의미 영역이 다를 가능성',
      score: 35,
      evidence: [
        `상품 신호: ${productDomains[0].label} (${productDomains[0].matchedTerms.join(', ')})`,
        `본문 신호: ${bodyDomains[0].label} (${bodyDomains[0].matchedTerms.join(', ')})`,
      ],
    });
  }

  return reasons;
}

function normalizeReview(review, index) {
  return {
    id: String(review.id ?? review.reviewId ?? review.review_id ?? index + 1),
    slug: normalizeText(review.slug ?? review.reviewSlug ?? review.review_slug),
    status: normalizeText(review.status),
    productId: normalizeText(review.productId ?? review.product_id),
    productName: normalizeText(review.productName ?? review.product_name),
    category: normalizeText(review.category ?? review.categoryName ?? review.category_name),
    title: normalizeText(review.title),
    content: normalizeText(review.content ?? review.reviewBody ?? review.review_body),
    createdAt: review.createdAt ?? review.created_at ?? null,
    updatedAt: review.updatedAt ?? review.updated_at ?? null,
    publishedAt: review.publishedAt ?? review.published_at ?? null,
  };
}

/**
 * 리뷰 한 건을 읽기 전용으로 감사한다. 반환값은 후보 분류이며 게시 상태를 변경하지 않는다.
 */
export function auditReviewContent(inputReview, index = 0) {
  const review = normalizeReview(inputReview, index);
  const claimSurfaces = [
    { label: '제목', text: review.title },
    { label: '본문', text: review.content },
  ].filter((surface) => surface.text);
  const reasons = [];
  const detectedCodes = new Set();

  for (const rule of reviewValidationConstants.unverifiedExperiencePatterns ?? []) {
    const evidence = findClaimEvidence(claimSurfaces, rule.pattern);
    if (!evidence) continue;
    const meta = EXPERIENCE_RULE_META[rule.code] ?? { score: 20, label: rule.code };
    reasons.push({ code: rule.code, label: meta.label, score: meta.score, evidence: [evidence.snippet] });
    detectedCodes.add(rule.code);
  }

  for (const rule of CLAIM_RULES) {
    if (rule.skipIfCodes?.some((code) => detectedCodes.has(code))) continue;
    const evidence = findClaimEvidence(claimSurfaces, rule.pattern, rule.allowVerificationContext);
    if (!evidence) continue;
    reasons.push({ code: rule.code, label: rule.label, score: rule.score, evidence: [evidence.snippet] });
    detectedCodes.add(rule.code);
  }

  reasons.push(...mismatchReasons(review, review.content));

  const riskScore = Math.min(100, reasons.reduce((sum, reason) => sum + reason.score, 0));
  return {
    ...review,
    riskScore,
    riskLevel: riskLevel(riskScore),
    manualReviewRequired: riskScore >= 20,
    automatedAction: 'none',
    reasons,
  };
}

/**
 * 리뷰 배열을 감사하고 위험도 순으로 정렬된 보고서를 만든다.
 */
export function createContentAuditReport(reviews, metadata = {}) {
  if (!Array.isArray(reviews)) {
    throw new TypeError('reviews must be an array');
  }

  const audited = reviews
    .map((review, index) => auditReviewContent(review, index))
    .sort((a, b) => b.riskScore - a.riskScore || a.id.localeCompare(b.id));
  const countsByRiskLevel = { critical: 0, high: 0, medium: 0, low: 0, none: 0 };
  for (const review of audited) countsByRiskLevel[review.riskLevel] += 1;

  return {
    metadata: {
      ...metadata,
      generatedAt: new Date().toISOString(),
      readOnly: true,
      automatedChangesApplied: false,
      classifierVersion: '1.0.0',
      totalReviews: audited.length,
      manualReviewCandidates: audited.filter((review) => review.manualReviewRequired).length,
      countsByRiskLevel,
      note: '규칙 기반 감사 후보입니다. 비공개·noindex·삭제 여부는 사람이 원문과 근거를 확인한 뒤 결정해야 합니다.',
    },
    reviews: audited,
  };
}

function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function contentAuditReportToCsv(report) {
  const columns = [
    'id', 'slug', 'status', 'product_id', 'product_name', 'category', 'risk_score', 'risk_level',
    'manual_review_required', 'automated_action', 'reason_codes', 'reason_labels', 'evidence',
  ];
  const rows = report.reviews.map((review) => [
    review.id,
    review.slug,
    review.status,
    review.productId,
    review.productName,
    review.category,
    review.riskScore,
    review.riskLevel,
    review.manualReviewRequired,
    review.automatedAction,
    review.reasons.map((reason) => reason.code).join('|'),
    review.reasons.map((reason) => reason.label).join('|'),
    review.reasons.flatMap((reason) => reason.evidence).join(' | '),
  ]);
  return [columns.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n') + '\n';
}

export const __contentAuditConstants = {
  CLAIM_RULES,
  DOMAIN_DEFINITIONS,
};

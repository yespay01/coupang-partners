import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPrompt,
  findUnverifiedExperienceClaim,
  validateReviewContentWithSettings,
} from '../src/services/reviewUtils.js';

const validationSettings = {
  minLength: 1,
  maxLength: 1000,
  toneScoreThreshold: 0,
};

test('사실 확인을 안내하는 문장은 체험 주장으로 오탐하지 않는다', () => {
  const guide = '배송이 빠른지, 포장이 안전한지는 쿠팡 상품 페이지의 현재 정보를 확인하세요.';

  assert.equal(findUnverifiedExperienceClaim(guide), null);
  assert.doesNotThrow(() => validateReviewContentWithSettings(guide, validationSettings));
});

test('1인칭 구매·사용 주장을 차단한다', () => {
  const claims = [
    ['내돈내산으로 구매한 제품입니다.', 'PERSONAL_PURCHASE_CLAIM'],
    ['저는 이 상품을 주문해서 사용해 봤습니다.', 'FIRST_PERSON_EXPERIENCE_CLAIM'],
    ['직접 구매해서 써 봤습니다.', 'DIRECT_EXPERIENCE_CLAIM'],
    ['며칠 사용해 보니 만족스러웠습니다.', 'OBSERVED_USE_CLAIM'],
  ];

  for (const [text, expectedCode] of claims) {
    assert.equal(findUnverifiedExperienceClaim(text), expectedCode);
    assert.throws(
      () => validateReviewContentWithSettings(text, validationSettings),
      new RegExp(`REVIEW_CONTAINS_UNVERIFIED_EXPERIENCE:${expectedCode}`)
    );
  }
});

test('배송·포장 체험 주장을 차단한다', () => {
  assert.equal(
    findUnverifiedExperienceClaim('배송이 빨랐고 포장도 좋았습니다.'),
    'DELIVERY_EXPERIENCE_CLAIM'
  );
  assert.equal(
    findUnverifiedExperienceClaim('택배 상자를 열어 보니 상품이 잘 들어 있었습니다.'),
    'PACKAGING_EXPERIENCE_CLAIM'
  );
});

test('레거시 기본 프롬프트도 체험을 꾸며내지 않도록 안내한다', () => {
  const prompt = buildPrompt({ name: '테스트 상품', category: '생활용품' });

  assert.match(prompt, /선택 가이드/);
  assert.match(prompt, /직접 구매하거나 사용한 것처럼 쓰지 말고/);
  assert.doesNotMatch(prompt, /실제 사용 경험처럼/);
});

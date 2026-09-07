import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  auditReviewContent,
  contentAuditReportToCsv,
  createContentAuditReport,
} from '../src/services/contentAudit.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(testDir, 'fixtures/review-audit-sample.json');

async function loadFixtureReviews() {
  return JSON.parse(await readFile(fixturePath, 'utf8')).reviews;
}

test('확인 안내 문장은 가격·배송 혜택 주장으로 오탐하지 않는다', () => {
  const result = auditReviewContent({
    id: 'safe',
    productName: '블루투스 이어폰',
    category: '가전디지털',
    content: '블루투스 이어폰은 연결 방식과 배터리 시간을 비교해야 합니다. 로켓배송 가능 여부와 최저가인지 쿠팡 상품 페이지에서 확인하세요.',
  });

  assert.equal(result.riskScore, 0);
  assert.equal(result.riskLevel, 'none');
  assert.equal(result.manualReviewRequired, false);
  assert.equal(result.automatedAction, 'none');
});

test('허위 체험·내돈내산·할인·효능 후보를 이유별로 분류한다', () => {
  const result = auditReviewContent({
    id: 'claims',
    productName: '비타민 제품',
    category: '건강식품',
    content: '내돈내산으로 직접 먹어 보니 혈당이 줄어드는 효과가 있었고 현재 30% 할인 중입니다.',
  });
  const codes = new Set(result.reasons.map((reason) => reason.code));

  assert.equal(result.riskScore, 100);
  assert.equal(result.riskLevel, 'critical');
  assert.equal(result.manualReviewRequired, true);
  assert.equal(result.automatedAction, 'none');
  assert.ok(codes.has('PERSONAL_PURCHASE_CLAIM'));
  assert.ok(codes.has('OBSERVED_USE_CLAIM'));
  assert.ok(codes.has('DISCOUNT_CLAIM'));
  assert.ok(codes.has('EFFICACY_CLAIM'));
});

test('배송·포장 경험 주장을 기존 reviewUtils 규칙으로 재사용해 찾는다', () => {
  const result = auditReviewContent({
    productName: '생활용품 테스트 상품',
    category: '생활용품',
    content: '배송이 빨랐고 포장도 꼼꼼했습니다. 택배 상자를 열어 보니 제품이 잘 들어 있었습니다.',
  });
  const codes = new Set(result.reasons.map((reason) => reason.code));

  assert.ok(codes.has('DELIVERY_EXPERIENCE_CLAIM'));
  assert.ok(codes.has('PACKAGING_EXPERIENCE_CLAIM'));
});

test('기존 검증보다 넓은 사용 경험 표현도 감사 후보로 찾는다', () => {
  const result = auditReviewContent({
    productName: '테스트 상품',
    category: '생활용품',
    content: '한 달 써봤는데 관리가 편했습니다.',
  });

  assert.ok(result.reasons.some((reason) => reason.code === 'UNVERIFIED_USE_CLAIM'));
  assert.equal(result.manualReviewRequired, true);
});

test('본문뿐 아니라 제목의 최저가 주장도 감사한다', () => {
  const result = auditReviewContent({
    productName: '테스트 상품',
    category: '생활용품',
    title: '테스트 상품 쿠팡 최저가 후기',
    content: '테스트 상품을 고를 때는 구성과 옵션을 확인하세요.',
  });

  assert.ok(result.reasons.some((reason) => reason.code === 'LOWEST_PRICE_CLAIM'));
  assert.match(result.reasons[0].evidence[0], /\[제목\]/);
});

test('상품-본문 의미 불일치는 확정 조치가 아닌 사람 검수 후보로 표시한다', async () => {
  const fixture = await loadFixtureReviews();
  const water = auditReviewContent(fixture.find((review) => review.id === 'mismatch-1'));
  const jewelry = auditReviewContent(fixture.find((review) => review.id === 'mismatch-2'));

  for (const result of [water, jewelry]) {
    assert.ok(result.reasons.some((reason) => reason.code === 'PRODUCT_CONTENT_DOMAIN_MISMATCH'));
    assert.equal(result.manualReviewRequired, true);
    assert.equal(result.automatedAction, 'none');
  }
});

test('보고서는 위험도 순으로 정렬하고 자동 변경 없음 메타데이터를 강제한다', async () => {
  const report = createContentAuditReport(await loadFixtureReviews(), {
    source: 'test-fixture',
    readOnly: false,
    automatedChangesApplied: true,
  });

  assert.equal(report.metadata.totalReviews, 4);
  assert.equal(report.metadata.readOnly, true);
  assert.equal(report.metadata.automatedChangesApplied, false);
  assert.equal(report.metadata.source, 'test-fixture');
  assert.ok(report.reviews[0].riskScore >= report.reviews[1].riskScore);
  assert.ok(report.metadata.manualReviewCandidates >= 3);
});

test('CSV는 위험 사유를 내보내고 스프레드시트 수식 주입을 막는다', () => {
  const report = createContentAuditReport([
    {
      id: '=1+1',
      productName: '+위험 상품',
      content: '최저가 상품입니다.',
    },
  ]);
  const csv = contentAuditReportToCsv(report);

  assert.match(csv, /LOWEST_PRICE_CLAIM/);
  assert.match(csv, /"'=1\+1"/);
  assert.match(csv, /"'\+위험 상품"/);
});

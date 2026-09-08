import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadSearchPerformanceSnapshot,
  normalizeSearchPerformanceSource,
} from '../src/services/searchPerformance.js';

test('검색 성과 소스의 숫자와 CTR을 정규화한다', () => {
  assert.deepEqual(
    normalizeSearchPerformanceSource('google', {
      configured: true,
      totalImpressions: '200',
      totalClicks: '4',
    }, '2026-09-08T00:00:00.000Z'),
    {
      source: 'google',
      configured: true,
      impressions: 200,
      clicks: 4,
      ctrPct: 2,
      keywords: [],
      pages: [],
      observedAt: '2026-09-08T00:00:00.000Z',
      message: null,
    }
  );
});

test('Google과 네이버 중 한 소스가 실패해도 나머지 검색 성과를 유지한다', async () => {
  const snapshot = await loadSearchPerformanceSnapshot({
    now: new Date('2026-09-08T00:00:00.000Z'),
    async loadGoogle() { throw new Error('gsc unavailable'); },
    async loadNaver() {
      return {
        configured: true,
        totalImpressions: 19659,
        totalClicks: 202,
        averageCtr: 1.03,
        cookieUpdatedAt: '2026-09-07T23:55:00.000Z',
        pages: [{ page: 'https://semolink.store/products/1', impressions: 40, clicks: 1, ctr: 2.5, position: 2 }],
      };
    },
  });

  assert.equal(snapshot.windowDays, 30);
  assert.equal(snapshot.sources[0].configured, false);
  assert.equal(snapshot.sources[0].message, 'gsc unavailable');
  assert.equal(snapshot.sources[1].impressions, 19659);
  assert.equal(snapshot.sources[1].observedAt, '2026-09-07T23:55:00.000Z');
  assert.equal(snapshot.sources[1].pages[0].page, 'https://semolink.store/products/1');
});

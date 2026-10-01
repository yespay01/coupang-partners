import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INDEXNOW_KEY,
  buildContentUrl,
  buildIndexNowPayload,
  isIndexNowEnabled,
  submitIndexNow,
} from '../src/services/indexNow.js';

test('buildContentUrl prefers slug and encodes it', () => {
  assert.equal(
    buildContentUrl('news', { id: 3, slug: '로또 1243회' }),
    'https://semolink.store/news/%EB%A1%9C%EB%98%90%201243%ED%9A%8C',
  );
  assert.equal(buildContentUrl('recipes', { id: 7 }), 'https://semolink.store/recipes/7');
  assert.equal(buildContentUrl('news', {}), null);
});

test('buildIndexNowPayload dedupes and drops foreign hosts', () => {
  const payload = buildIndexNowPayload([
    'https://semolink.store/news/a',
    'https://semolink.store/news/a',
    'https://example.com/x',
  ]);
  assert.deepEqual(payload, {
    host: 'semolink.store',
    key: INDEXNOW_KEY,
    keyLocation: `https://semolink.store/${INDEXNOW_KEY}.txt`,
    urlList: ['https://semolink.store/news/a'],
  });
  assert.equal(buildIndexNowPayload([null]), null);
});

test('isIndexNowEnabled only in production unless disabled', () => {
  assert.equal(isIndexNowEnabled({ NODE_ENV: 'production' }), true);
  assert.equal(isIndexNowEnabled({ NODE_ENV: 'production', INDEXNOW_ENABLED: 'false' }), false);
  assert.equal(isIndexNowEnabled({ NODE_ENV: 'development' }), false);
});

test('submitIndexNow posts payload and never throws', async () => {
  let request;
  const result = await submitIndexNow(['https://semolink.store/news/a'], {
    env: { NODE_ENV: 'production' },
    fetchImpl: async (url, options) => {
      request = { url, body: JSON.parse(options.body) };
      return { status: 202 };
    },
  });
  assert.deepEqual(result, { ok: true, status: 202 });
  assert.equal(request.url, 'https://api.indexnow.org/indexnow');
  assert.deepEqual(request.body.urlList, ['https://semolink.store/news/a']);

  const failed = await submitIndexNow(['https://semolink.store/news/a'], {
    env: { NODE_ENV: 'production' },
    fetchImpl: async () => { throw new Error('network'); },
  });
  assert.equal(failed.ok, false);

  const skipped = await submitIndexNow(['https://semolink.store/news/a'], { env: {} });
  assert.deepEqual(skipped, { skipped: true });
});

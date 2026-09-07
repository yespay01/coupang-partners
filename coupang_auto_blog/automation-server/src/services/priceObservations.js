import crypto from 'node:crypto';

export const PRICE_OBSERVATION_SOURCES = new Set(['collection', 'daily_search_match']);

export function normalizeObservedPrice(value) {
  const price = typeof value === 'string' && /^\d+$/.test(value)
    ? Number(value)
    : value;
  if (!Number.isSafeInteger(price) || price <= 0) return null;
  return price;
}

export function validatePriceObservation(input) {
  if (!input || typeof input !== 'object') return { valid: false, reason: 'invalid_input' };
  if (
    typeof input.productId !== 'string'
    || input.productId.length < 1
    || input.productId.length > 255
    || /[\u0000-\u001f\u007f]/.test(input.productId)
  ) {
    return { valid: false, reason: 'invalid_product_id' };
  }
  const priceKrw = normalizeObservedPrice(input.priceKrw);
  if (priceKrw == null) return { valid: false, reason: 'invalid_price' };
  if (!PRICE_OBSERVATION_SOURCES.has(input.source)) {
    return { valid: false, reason: 'invalid_source' };
  }
  const observedAt = input.observedAt instanceof Date
    ? input.observedAt
    : new Date(input.observedAt || Date.now());
  if (Number.isNaN(observedAt.getTime())) return { valid: false, reason: 'invalid_observed_at' };
  const context = input.context == null ? null : String(input.context);
  if (context && (context.length > 255 || /[\u0000-\u001f\u007f]/.test(context))) {
    return { valid: false, reason: 'invalid_context' };
  }
  return { valid: true, productId: input.productId, priceKrw, source: input.source, observedAt, context };
}

export async function recordPriceObservation(db, input) {
  const validation = validatePriceObservation(input);
  if (!validation.valid) {
    const error = new Error(`가격 관측값이 올바르지 않습니다: ${validation.reason}`);
    error.code = validation.reason;
    error.status = 422;
    throw error;
  }
  const result = await db.query(
    `INSERT INTO price_observations (
       observation_id, product_id, price_krw, currency, observed_at,
       business_date_kst, observation_source, collection_context, is_synthetic
     ) VALUES (
       $1,$2,$3,'KRW',$4,($4::timestamptz AT TIME ZONE 'Asia/Seoul')::date,$5,$6,FALSE
     )
     ON CONFLICT (product_id, business_date_kst) DO UPDATE SET
       price_krw = EXCLUDED.price_krw,
       observed_at = EXCLUDED.observed_at,
       observation_source = EXCLUDED.observation_source,
       collection_context = EXCLUDED.collection_context,
       is_synthetic = FALSE,
       updated_at = NOW()
     WHERE EXCLUDED.observed_at >= price_observations.observed_at
     RETURNING observation_id, product_id, price_krw, currency, observed_at,
               business_date_kst, observation_source, collection_context, is_synthetic`,
    [
      crypto.randomUUID(),
      validation.productId,
      validation.priceKrw,
      validation.observedAt.toISOString(),
      validation.source,
      validation.context,
    ]
  );
  return result.rows[0] || null;
}

export async function applyObservedProductPrice(db, {
  productId,
  priceKrw,
  observedAt = new Date(),
  source,
  context = null,
}) {
  const price = normalizeObservedPrice(priceKrw);
  if (price == null) {
    const error = new Error('실제 양의 정수 가격만 저장할 수 있습니다.');
    error.code = 'invalid_price';
    error.status = 422;
    throw error;
  }
  const client = typeof db.connect === 'function' ? await db.connect() : db;
  try {
    await client.query('BEGIN');
    const product = await client.query(
      'SELECT product_id FROM products WHERE product_id = $1 FOR UPDATE',
      [productId]
    );
    if (product.rowCount !== 1) {
      const error = new Error('가격을 기록할 상품이 없습니다.');
      error.code = 'product_not_found';
      error.status = 404;
      throw error;
    }
    const observation = await recordPriceObservation(client, {
      productId,
      priceKrw: price,
      observedAt,
      source,
      context,
    });
    // 같은 KST 날짜에 더 최신 실제 관측이 있으면 오래된 값으로 현재가를 되돌리지 않는다.
    if (!observation) {
      await client.query('COMMIT');
      return null;
    }
    await client.query(
      `UPDATE products
          SET product_price = $2, updated_at = NOW()
        WHERE product_id = $1`,
      [productId, price]
    );
    await client.query(
      `UPDATE reviews
          SET product_price = $2, updated_at = NOW()
        WHERE product_id = $1`,
      [productId, price]
    );
    await client.query('COMMIT');
    return observation;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    if (client !== db && typeof client.release === 'function') client.release();
  }
}

export function buildPriceHistoryDto(productId, rows) {
  const points = (Array.isArray(rows) ? rows : []).map((row) => ({
    businessDateKst: row.business_date_kst instanceof Date
      ? row.business_date_kst.toISOString().slice(0, 10)
      : String(row.business_date_kst).slice(0, 10),
    observedAt: row.observed_at instanceof Date ? row.observed_at.toISOString() : row.observed_at,
    priceKrw: Number(row.price_krw),
    currency: row.currency || 'KRW',
    source: row.observation_source,
  }));
  return {
    productId,
    chartStatus: points.length >= 2 ? 'available' : 'insufficient_data',
    minimumPointCount: 2,
    pointCount: points.length,
    isSynthetic: false,
    points,
  };
}

export function normalizeProductSearchKeyword(value) {
  const normalized = String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('ko-KR');
  if (normalized.length < 2 || normalized.length > 50) return null;
  if (/https?:|www\.|@|\d{7,}/i.test(normalized)) return null;
  if (!/^[\p{Script=Hangul}\p{Letter}\p{Number}\s+&._\/-]+$/u.test(normalized)) return null;
  return normalized;
}

export async function recordProductSearchDemand(db, keyword, now = new Date()) {
  const normalizedKeyword = normalizeProductSearchKeyword(keyword);
  if (!normalizedKeyword) return { recorded: false, normalizedKeyword: null, rollingCount: 0 };
  const result = await db.query(
    `WITH upserted AS (
       INSERT INTO product_search_demand (
         business_date_kst, normalized_keyword, search_count,
         first_searched_at, last_searched_at, created_at, updated_at
       ) VALUES (
         ($2::timestamptz AT TIME ZONE 'Asia/Seoul')::date, $1, 1, $2, $2, NOW(), NOW()
       )
       ON CONFLICT (business_date_kst, normalized_keyword) DO UPDATE SET
         search_count = product_search_demand.search_count + 1,
         last_searched_at = EXCLUDED.last_searched_at,
         updated_at = NOW()
       RETURNING normalized_keyword
     )
     SELECT COALESCE(SUM(d.search_count), 0)::int AS rolling_count
       FROM product_search_demand d, upserted u
      WHERE d.normalized_keyword = u.normalized_keyword
        AND d.business_date_kst >= (($2::timestamptz AT TIME ZONE 'Asia/Seoul')::date - 13)`,
    [normalizedKeyword, now.toISOString()]
  );
  return {
    recorded: true,
    normalizedKeyword,
    rollingCount: Number(result.rows[0]?.rolling_count || 0),
  };
}

export async function getPopularSearchDemandKeywords(db, {
  now = new Date(), days = 14, limit = 5, minimumSearches = 2,
} = {}) {
  const safeDays = Math.min(Math.max(Number(days) || 14, 1), 30);
  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);
  const safeMinimum = Math.min(Math.max(Number(minimumSearches) || 2, 2), 1000);
  const result = await db.query(
    `SELECT normalized_keyword, SUM(search_count)::int AS search_count,
            MAX(last_searched_at) AS last_searched_at
       FROM product_search_demand
      WHERE business_date_kst >= (($1::timestamptz AT TIME ZONE 'Asia/Seoul')::date - ($2::int - 1))
      GROUP BY normalized_keyword
     HAVING SUM(search_count) >= $3
      ORDER BY search_count DESC, last_searched_at DESC, normalized_keyword ASC
      LIMIT $4`,
    [now.toISOString(), safeDays, safeMinimum, safeLimit]
  );
  return result.rows.map((row) => String(row.normalized_keyword));
}

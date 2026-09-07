import { fileURLToPath } from 'url';

import {
  closeDatabase,
  getDb,
  initializeDatabase,
} from '../src/config/database.js';
import { getSystemSettings } from '../src/services/settingsService.js';
import { isShortAffiliateUrl } from '../src/services/coupang/affiliateUrl.js';
import {
  registerAffiliateLink,
  validateAffiliateLinkRegistration,
} from '../src/services/coupang/affiliateLinkRegistry.js';

export function parseBackfillArgs(argv = []) {
  const supported = new Set(['--apply', '--dry-run']);
  const unknown = argv.filter((arg) => !supported.has(arg));
  if (unknown.length > 0) throw new Error(`지원하지 않는 인자: ${unknown.join(', ')}`);
  if (argv.includes('--apply') && argv.includes('--dry-run')) {
    throw new Error('--apply와 --dry-run을 동시에 사용할 수 없습니다.');
  }
  return { apply: argv.includes('--apply') };
}

export async function runAffiliateLinkBackfill({ db, settings, apply = false }) {
  const { partnerId, subId } = settings.coupang || {};
  const stats = {
    mode: apply ? 'apply' : 'dry-run',
    productsEligible: 0,
    reviewsEligible: 0,
    skippedShortReviews: 0,
    invalid: 0,
    applied: 0,
  };
  const client = apply && typeof db.connect === 'function' ? await db.connect() : db;

  if (apply) await client.query('BEGIN');
  try {
    const products = await client.query(
      `SELECT product_id, product_url
         FROM products
        WHERE affiliate_link_id IS NULL AND product_url IS NOT NULL AND product_url <> ''`
    );
    for (const product of products.rows) {
      const input = {
        productId: product.product_id,
        destinationUrl: product.product_url,
        partnerId,
        subId,
        linkSource: 'product_api',
      };
      if (!validateAffiliateLinkRegistration(input).valid) {
        stats.invalid += 1;
        continue;
      }
      stats.productsEligible += 1;
      if (apply) {
        const link = await registerAffiliateLink(client, input);
        await client.query(
          'UPDATE products SET affiliate_link_id = $2, updated_at = NOW() WHERE product_id = $1',
          [product.product_id, link.link_id]
        );
        stats.applied += 1;
      }
    }

    if (apply) {
      const joined = await client.query(
        `UPDATE reviews r
            SET affiliate_link_id = p.affiliate_link_id, updated_at = NOW()
           FROM products p
          WHERE r.affiliate_link_id IS NULL
            AND r.product_id = p.product_id
            AND p.affiliate_link_id IS NOT NULL`
      );
      stats.applied += joined.rowCount || 0;
    }

    const reviews = await client.query(
      `SELECT id, product_id, affiliate_url
         FROM reviews
        WHERE affiliate_link_id IS NULL AND affiliate_url IS NOT NULL AND affiliate_url <> ''`
    );
    for (const review of reviews.rows) {
      if (isShortAffiliateUrl(review.affiliate_url)) {
        stats.skippedShortReviews += 1;
        continue;
      }
      const input = {
        productId: review.product_id,
        destinationUrl: review.affiliate_url,
        partnerId,
        subId,
        linkSource: 'legacy',
      };
      if (!validateAffiliateLinkRegistration(input).valid) {
        stats.invalid += 1;
        continue;
      }
      stats.reviewsEligible += 1;
      if (apply) {
        const link = await registerAffiliateLink(client, input);
        await client.query(
          'UPDATE reviews SET affiliate_link_id = $2, updated_at = NOW() WHERE id = $1',
          [review.id, link.link_id]
        );
        stats.applied += 1;
      }
    }

    if (apply) await client.query('COMMIT');
    return stats;
  } catch (error) {
    if (apply) await client.query('ROLLBACK');
    throw error;
  } finally {
    if (apply && client !== db && typeof client.release === 'function') client.release();
  }
}

async function main() {
  const options = parseBackfillArgs(process.argv.slice(2));
  initializeDatabase();
  const stats = await runAffiliateLinkBackfill({
    db: getDb(),
    settings: await getSystemSettings(),
    apply: options.apply,
  });
  console.info('제휴 링크 백필 검증 완료', stats);
  if (!options.apply) {
    console.info('기본값은 dry-run입니다. 실제 반영은 --apply를 명시해야 합니다.');
  }
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  main()
    .catch((error) => {
      console.error('제휴 링크 백필 실패:', error.message);
      process.exitCode = 1;
    })
    .finally(() => closeDatabase());
}

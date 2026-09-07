#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import pg from 'pg';

import {
  contentAuditReportToCsv,
  createContentAuditReport,
} from '../src/services/contentAudit.js';

const { Client } = pg;

function printHelp() {
  console.log(`기존 리뷰 콘텐츠를 읽기 전용으로 감사합니다.

사용법:
  node scripts/audit-review-content.js --input reviews.json --output-dir /tmp/audit [옵션]
  DATABASE_URL=postgres://... node scripts/audit-review-content.js --database --output-dir /tmp/audit [옵션]

옵션:
  --input <path>       JSON 파일. 배열 또는 { "reviews": [...] } 형식
  --database           DATABASE_URL로 PostgreSQL reviews 테이블 읽기 (--db 별칭)
  --status <status>    DB 조회 상태 필터 (기본: 전체)
  --limit <number>     DB 최대 조회 건수 (기본: 100000)
  --output-dir <path>  보고서 저장 폴더 (필수, 기존 파일 덮어쓰기 금지)
  --format <value>     both, json, csv 중 하나 (기본: both)
  --help               도움말

이 도구는 SELECT와 READ ONLY 트랜잭션만 사용하며 비공개, noindex, 삭제를 적용하지 않습니다.`);
}

function parseArgs(argv) {
  const options = {
    input: null,
    db: false,
    status: null,
    limit: 100000,
    outputDir: null,
    format: 'both',
    help: false,
  };

  const valueAfter = (index, option) => {
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${option} 뒤에 값을 지정해야 합니다.`);
    }
    return value;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--database' || arg === '--db') {
      options.db = true;
    } else if (arg === '--input') {
      options.input = valueAfter(i, arg);
      i += 1;
    } else if (arg === '--status') {
      options.status = valueAfter(i, arg);
      i += 1;
    } else if (arg === '--limit') {
      options.limit = Number(valueAfter(i, arg));
      i += 1;
    } else if (arg === '--output-dir') {
      options.outputDir = path.resolve(valueAfter(i, arg));
      i += 1;
    } else if (arg === '--format') {
      options.format = valueAfter(i, arg);
      i += 1;
    } else {
      throw new Error(`알 수 없는 옵션: ${arg}`);
    }
  }

  if (!options.help && Boolean(options.input) === options.db) {
    throw new Error('--input 또는 --database 중 하나만 지정해야 합니다.');
  }
  if (!options.help && !options.outputDir) {
    throw new Error('--output-dir을 명시해야 합니다.');
  }
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100000) {
    throw new Error('--limit은 1~100000 사이의 정수여야 합니다.');
  }
  if (!['both', 'json', 'csv'].includes(options.format)) {
    throw new Error('--format은 both, json, csv 중 하나여야 합니다.');
  }
  if (options.status && !/^[a-z0-9_-]{1,50}$/i.test(options.status)) {
    throw new Error('--status 형식이 올바르지 않습니다.');
  }

  return options;
}

function reviewsFromJson(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.reviews)) return parsed.reviews;
  if (Array.isArray(parsed?.data)) return parsed.data;
  if (Array.isArray(parsed?.data?.reviews)) return parsed.data.reviews;
  throw new Error('JSON은 리뷰 배열 또는 reviews/data 배열을 포함해야 합니다.');
}

async function loadJsonReviews(inputPath) {
  const absolutePath = path.resolve(inputPath);
  const parsed = JSON.parse(await readFile(absolutePath, 'utf8'));
  return { reviews: reviewsFromJson(parsed), source: `json:${absolutePath}` };
}

async function loadDatabaseReviews({ status, limit }) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('--database 사용 시 DATABASE_URL 환경변수가 필요합니다.');
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const result = await client.query(
      `SELECT
         id::text AS id,
         product_id AS "productId",
         product_name AS "productName",
         title,
         content,
         slug,
         status,
         category,
         created_at AS "createdAt",
         updated_at AS "updatedAt",
         published_at AS "publishedAt"
       FROM reviews
       WHERE ($1::text IS NULL OR status = $1)
       ORDER BY id
       LIMIT $2`,
      [status, limit]
    );
    await client.query('COMMIT');
    return { reviews: result.rows, source: `postgres:reviews${status ? `:${status}` : ''}` };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function reportStem(date = new Date()) {
  return `review-content-audit-${date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`;
}

async function writeReports(report, options) {
  await mkdir(options.outputDir, { recursive: true });
  const stem = reportStem();
  const written = [];

  if (options.format === 'both' || options.format === 'json') {
    const jsonPath = path.join(options.outputDir, `${stem}.json`);
    await writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    written.push(jsonPath);
  }
  if (options.format === 'both' || options.format === 'csv') {
    const csvPath = path.join(options.outputDir, `${stem}.csv`);
    await writeFile(csvPath, contentAuditReportToCsv(report), { encoding: 'utf8', flag: 'wx' });
    written.push(csvPath);
  }

  return written;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const loaded = options.db
    ? await loadDatabaseReviews(options)
    : await loadJsonReviews(options.input);
  const report = createContentAuditReport(loaded.reviews, { source: loaded.source });
  const written = await writeReports(report, options);

  console.log(`감사 완료: ${report.metadata.totalReviews}건`);
  console.log(`사람 검수 후보: ${report.metadata.manualReviewCandidates}건`);
  console.log(`위험도: ${JSON.stringify(report.metadata.countsByRiskLevel)}`);
  for (const outputPath of written) console.log(`보고서: ${outputPath}`);
  console.log('자동 상태 변경: 없음');
}

main().catch((error) => {
  console.error(`콘텐츠 감사 실패: ${error.message}`);
  process.exitCode = 1;
});

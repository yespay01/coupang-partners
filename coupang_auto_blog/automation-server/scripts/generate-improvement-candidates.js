#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { generateImprovementCandidates } from '../src/services/improvementCandidates.js';

function help() {
  console.log(`daily_metric_rollups JSON으로 개선 후보 제안서를 생성합니다.

사용법:
  node scripts/generate-improvement-candidates.js \\
    --input /tmp/daily-rollups.json \\
    --output /tmp/improvement-candidates.json \\
    [--business-date 2026-08-24]

이 CLI는 DB, Slack, UI, 콘텐츠를 변경하지 않으며 기존 출력 파일을 덮어쓰지 않습니다.`);
}

function parseArgs(argv) {
  const options = { input: null, output: null, businessDateKst: null, help: false };
  const valueAfter = (index, option) => {
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${option} 뒤에 값을 지정해야 합니다.`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--input') {
      options.input = path.resolve(valueAfter(i, arg));
      i += 1;
    } else if (arg === '--output') {
      options.output = path.resolve(valueAfter(i, arg));
      i += 1;
    } else if (arg === '--business-date') {
      options.businessDateKst = valueAfter(i, arg);
      i += 1;
    } else throw new Error(`알 수 없는 옵션: ${arg}`);
  }
  if (!options.help && (!options.input || !options.output)) {
    throw new Error('--input과 --output을 모두 명시해야 합니다.');
  }
  if (options.businessDateKst && !/^\d{4}-\d{2}-\d{2}$/.test(options.businessDateKst)) {
    throw new Error('--business-date는 YYYY-MM-DD 형식이어야 합니다.');
  }
  return options;
}

function rowsFromJson(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.rollups)) return parsed.rollups;
  if (Array.isArray(parsed?.data?.rollups)) return parsed.data.rollups;
  throw new Error('입력 JSON은 rollup 배열 또는 { "rollups": [...] } 형식이어야 합니다.');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    help();
    return;
  }
  const parsed = JSON.parse(await readFile(options.input, 'utf8'));
  const result = generateImprovementCandidates(rowsFromJson(parsed), {
    businessDateKst: options.businessDateKst,
  });
  const output = {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    automaticChangesApplied: false,
    ...result,
  };
  await writeFile(options.output, JSON.stringify(output, null, 2) + '\n', {
    encoding: 'utf8',
    flag: 'wx',
  });
  console.log(`진단일: ${result.businessDateKst}`);
  console.log(`후보: ${result.candidates.length}건`);
  console.log(`surface 분석: ${result.surfaceAvailability}`);
  console.log(`보고서: ${options.output}`);
  console.log('자동 UI·콘텐츠 변경: 없음');
}

main().catch((error) => {
  console.error(`개선 후보 생성 실패: ${error.message}`);
  process.exitCode = 1;
});

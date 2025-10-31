#!/usr/bin/env node
/* eslint-disable no-console */
import process from "node:process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function usage() {
  console.log(`
Usage:
  node ${__dirname.includes(" ") ? `"${__dirname}/setAdminClaim.js"` : `${__dirname}/setAdminClaim.js`} --email <adminEmail>
  node ${__dirname.includes(" ") ? `"${__dirname}/setAdminClaim.js"` : `${__dirname}/setAdminClaim.js`} --uid <firebaseUid>

Required environment variables:
  FIREBASE_ADMIN_PROJECT_ID
  FIREBASE_ADMIN_CLIENT_EMAIL
  FIREBASE_ADMIN_PRIVATE_KEY (주의: 개행은 \\n 으로 이스케이프해서 전달)
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--help" || token === "-h") {
      options.help = true;
      break;
    }
    if ((token === "--email" || token === "-e") && args[index + 1]) {
      options.email = args[index + 1];
      index += 1;
      continue;
    }
    if ((token === "--uid" || token === "-u") && args[index + 1]) {
      options.uid = args[index + 1];
      index += 1;
      continue;
    }
  }

  return options;
}

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`환경변수 ${key}가 설정되어 있지 않습니다.`);
  }
  return value;
}

async function bootstrapApp() {
  if (getApps().length) {
    return;
  }

  let privateKey = requireEnv("FIREBASE_ADMIN_PRIVATE_KEY");
  if (privateKey.startsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }

  initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_ADMIN_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

async function resolveUid({ email, uid }, auth) {
  if (uid) {
    return uid;
  }
  if (!email) {
    throw new Error("uid나 email 중 하나는 반드시 제공해야 합니다.");
  }
  const userRecord = await auth.getUserByEmail(email);
  return userRecord.uid;
}

async function main() {
  try {
    const options = parseArgs(process.argv);
    if (options.help) {
      usage();
      process.exit(0);
    }

    if (!options.email && !options.uid) {
      usage();
      process.exit(1);
    }

    await bootstrapApp();
    const auth = getAuth();
    const targetUid = await resolveUid(options, auth);

    await auth.setCustomUserClaims(targetUid, { admin: true });
    await auth.revokeRefreshTokens(targetUid);

    console.log(`✅ Custom claim 'admin=true' 설정이 완료되었습니다. (uid=${targetUid})`);
    console.log("⚠️ 기존 로그인 세션은 몇 분 내 자동 만료되며, 재로그인이 필요할 수 있습니다.");
  } catch (error) {
    console.error("🚨 관리자 클레임 설정 중 오류가 발생했습니다.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();


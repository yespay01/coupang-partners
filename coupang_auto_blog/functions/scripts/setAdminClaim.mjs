#!/usr/bin/env node

/**
 * setAdminClaim.mjs
 * CLI 도구: Firebase Auth 사용자에게 admin=true 커스텀 클레임 추가/해제
 *
 * 실행 예시:
 *   node scripts/setAdminClaim.mjs --email admin@example.com --set
 *   node scripts/setAdminClaim.mjs --email admin@example.com --unset
 *
 * 환경 변수:
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY  (개행은 \n 으로 이스케이프된 상태 가능)
 */

import { stdin as input, stdout as output, exit } from "node:process";
import { createInterface } from "node:readline/promises";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key.startsWith("--")) {
      if (key === "--set" || key === "--unset") {
        args.action = key === "--set" ? "set" : "unset";
        i -= 1;
        continue;
      }
      args[key.slice(2)] = value;
    }
  }
  return args;
}

function getServiceAccountFromEnv() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin 서비스 계정 환경변수가 모두 설정되어야 합니다.");
  }

  if (privateKey.startsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }

  privateKey = privateKey.replace(/\\n/g, "\n");

  return { projectId, clientEmail, privateKey };
}

async function ensureFirebaseAdmin() {
  if (!getApps().length) {
    const serviceAccount = getServiceAccountFromEnv();
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getAuth();
}

async function resolveEmailInteractive(currentEmail) {
  if (currentEmail) {
    return currentEmail;
  }

  const rl = createInterface({ input, output });
  const email = await rl.question("관리자 권한을 설정할 Firebase Auth 이메일을 입력하세요: ");
  rl.close();
  return email.trim();
}

async function resolveActionInteractive(currentAction) {
  if (currentAction) {
    return currentAction;
  }

  const rl = createInterface({ input, output });
  const answer = await rl.question("admin=true 클레임을 추가하려면 Y, 제거하려면 N 을 입력하세요 (Y/N): ");
  rl.close();
  return answer.trim().toLowerCase().startsWith("y") ? "set" : "unset";
}

async function main() {
  try {
    const args = parseArgs(process.argv);
    const email = await resolveEmailInteractive(args.email);
    const action = await resolveActionInteractive(args.action);

    if (!email) {
      throw new Error("이메일이 필요합니다.");
    }

    if (!["set", "unset"].includes(action)) {
      throw new Error("action은 set 또는 unset 이어야 합니다.");
    }

    const auth = await ensureFirebaseAdmin();
    const user = await auth.getUserByEmail(email);

    const currentClaims = user.customClaims ?? {};
    const nextClaims = { ...currentClaims };

    if (action === "set") {
      nextClaims.admin = true;
    } else {
      delete nextClaims.admin;
    }

    await auth.setCustomUserClaims(user.uid, nextClaims);

    console.log(
      `[setAdminClaim] ${email} 사용자에 대해 admin 클레임을 ${action === "set" ? "설정" : "해제"}했습니다.`,
    );
    console.log("[setAdminClaim] 변경 사항이 적용되려면 해당 사용자는 다시 로그인해야 합니다.");
  } catch (error) {
    console.error("[setAdminClaim] 작업에 실패했습니다:", error.message);
    exit(1);
  }
}

main();

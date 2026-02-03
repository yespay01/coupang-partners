import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { notifySlack } from "./slack.js";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const ACTION_SUMMARY_LIMIT = 5;

function formatSummary({ nextStatus, source, performedAt }) {
  const label = nextStatus?.replace?.("_", " ") ?? "unknown";
  const time = performedAt ?? new Date().toISOString();
  return `상태: ${label}, source=${source ?? "unknown"}, 수행 시각=${time}`;
}

async function logAdminAction(payload) {
  await db.collection("logs").add({
    type: "admin_action",
    level: "info",
    message: payload.message,
    payload,
    createdAt: new Date(),
  });
}

function buildSlackMessage(docId, data) {
  const summary = formatSummary(data);

  if (Array.isArray(data.reviewIds) && data.reviewIds.length > 0) {
    const preview = data.products?.slice(0, ACTION_SUMMARY_LIMIT).map((item) => {
      if (typeof item === "string") return item;
      return item?.product ?? item?.id ?? "알 수 없음";
    });
    const moreCount = Math.max(data.reviewIds.length - ACTION_SUMMARY_LIMIT, 0);
    const previewText = preview?.length ? preview.join(", ") : "항목 미상";
    const suffix = moreCount > 0 ? ` 외 ${moreCount}건` : "";

    return `일괄 처리 완료 (${data.reviewIds.length}건) - ${previewText}${suffix}\n${summary}\n문서 ID: ${docId}`;
  }

  const productLabel = data.product ?? data.reviewId ?? "항목 미상";
  return `단일 리뷰 처리 완료 - ${productLabel}\n${summary}\n문서 ID: ${docId}`;
}

export const handleAdminActions = onDocumentCreated("admin_actions/{actionId}", async (event) => {
  const docId = event.params.actionId;
  const data = event.data?.data();

  if (!data) {
    logger.warn("[admin_actions] 생성된 문서에 데이터가 없습니다.", { docId });
    return;
  }

  const message = buildSlackMessage(docId, data);

  await Promise.all([
    notifySlack({
      route: "admin",
      level: "info",
      title: "관리자 액션 처리",
      text: message,
      fields: [
        { label: "다음 상태", value: data.nextStatus ?? "-" },
        { label: "소스", value: data.source ?? "unknown" },
        {
          label: "건수",
          value: Array.isArray(data.reviewIds) ? `${data.reviewIds.length}` : "1",
        },
      ],
      context: docId ? `actionId=${docId}` : undefined,
    }),
    logAdminAction({
      docId,
      message,
      nextStatus: data.nextStatus,
      source: data.source,
      reviewId: data.reviewId,
      reviewIds: data.reviewIds,
      products: data.products,
      performedAt: data.performedAt ?? new Date().toISOString(),
    }),
  ]);
});

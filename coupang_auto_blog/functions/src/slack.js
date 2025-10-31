import fetch from "node-fetch";
import { logger } from "firebase-functions";

const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL ?? "";

const emojiMap = {
  error: "🚨",
  warn: "⚠️",
  info: "ℹ️",
  success: "✅",
};

export async function notifySlack(message, level = "info") {
  if (!slackWebhookUrl) {
    logger.debug("[slack] webhook URL이 설정되지 않아 알림을 건너뜁니다.");
    return;
  }

  const emoji = emojiMap[level] ?? emojiMap.info;

  try {
    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `${emoji} ${message}` }),
    });

    if (!response.ok) {
      throw new Error(`Slack responded with HTTP ${response.status}`);
    }
  } catch (error) {
    logger.error("[slack] 알림 전송 실패", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}


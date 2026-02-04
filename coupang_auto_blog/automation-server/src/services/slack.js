import fetch from "node-fetch";
import pRetry from "p-retry";
import { logger } from "firebase-functions";

const defaultWebhookUrl = (process.env.SLACK_WEBHOOK_URL ?? "").trim();

const emojiMap = {
  error: "🚨",
  warn: "⚠️",
  info: "ℹ️",
  success: "✅",
};

const DEFAULT_LEVEL_MENTIONS = {
  error: "<!here>",
  warn: "",
  info: "",
  success: "",
};

function safeParseJsonEnv(name) {
  const raw = process.env[name];
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    logger.warn(`[slack] ${name} must be a JSON object`);
  } catch (error) {
    logger.warn(`[slack] Failed to parse ${name}`, { error: error instanceof Error ? error.message : error });
  }
  return {};
}

function normalizeRouteMap(value) {
  return Object.entries(value).reduce((acc, [key, url]) => {
    if (typeof url === "string") {
      const trimmed = url.trim();
      if (trimmed) {
        acc[key] = trimmed;
      }
    }
    return acc;
  }, {});
}

function normalizeMentionMap(value) {
  return Object.entries(value).reduce((acc, [key, mention]) => {
    if (typeof mention === "string") {
      acc[key] = mention.trim();
    }
    return acc;
  }, {});
}

const slackRouteMap = normalizeRouteMap(safeParseJsonEnv("SLACK_WEBHOOK_ROUTES"));
const levelMentionMap = {
  ...DEFAULT_LEVEL_MENTIONS,
  ...normalizeMentionMap(safeParseJsonEnv("SLACK_LEVEL_MENTIONS")),
};

function resolveWebhookUrl(routeKey, level) {
  if (routeKey && slackRouteMap[routeKey]) {
    return slackRouteMap[routeKey];
  }
  if (level && slackRouteMap[level]) {
    return slackRouteMap[level];
  }
  if (slackRouteMap.default) {
    return slackRouteMap.default;
  }
  return defaultWebhookUrl;
}

function coerceMention(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim()).join(" ").trim();
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

function resolveMention(level, override, disableMentions) {
  if (disableMentions) {
    return "";
  }
  const explicit = coerceMention(override);
  if (explicit) {
    return explicit;
  }
  const fallback = levelMentionMap[level];
  return typeof fallback === "string" ? fallback : "";
}

function buildBlocks({ title, text, fields, context }) {
  const blocks = [];

  if (title) {
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: title.slice(0, 150),
      },
    });
  }

  if (text) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text,
      },
    });
  }

  if (Array.isArray(fields) && fields.length) {
    blocks.push({
      type: "section",
      fields: fields.slice(0, 10).map((field) => ({
        type: "mrkdwn",
        text: `*${field.label ?? ""}*\n${field.value ?? "-"}`,
      })),
    });
  }

  if (context) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: context,
        },
      ],
    });
  }

  return blocks.length ? blocks : undefined;
}

export async function notifySlack(payload, fallbackLevel = "info") {
  const normalized =
    typeof payload === "string"
      ? { text: payload, level: fallbackLevel }
      : { ...payload, level: payload.level ?? fallbackLevel };

  const level = normalized.level ?? "info";
  const routeKey = normalized.route ?? normalized.channel ?? normalized.eventType ?? normalized.topic ?? null;
  const explicitWebhook =
    typeof normalized.webhookUrl === "string" && normalized.webhookUrl.trim()
      ? normalized.webhookUrl.trim()
      : null;
  const webhookUrl = explicitWebhook ?? resolveWebhookUrl(routeKey, level);

  if (!webhookUrl) {
    logger.debug("[slack] No webhook configured for route", { route: routeKey ?? "default", level });
    return;
  }

  const mention = resolveMention(
    level,
    normalized.mention ?? normalized.mentions ?? normalized.mentionOverride,
    normalized.disableMentions,
  );
  const baseText = normalized.text ?? normalized.title ?? "알림";
  const decoratedText = mention ? `${mention} ${baseText}` : baseText;
  const emoji = emojiMap[level] ?? emojiMap.info;
  const body = {
    text: `${emoji} ${decoratedText}`.trim(),
    blocks:
      normalized.blocks ??
      buildBlocks({
        title: normalized.title ? `${emoji} ${normalized.title}` : undefined,
        text: decoratedText,
        fields: normalized.fields,
        context: normalized.context,
      }),
  };

  const send = async () => {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Slack responded with HTTP ${response.status}`);
    }
  };

  try {
    await pRetry(send, {
      retries: 2,
      onFailedAttempt: (error) => {
        logger.warn("[slack] 전송 재시도", {
          attempt: error.attemptNumber,
          retriesLeft: error.retriesLeft,
          reason: error.message,
        });
      },
    });
  } catch (error) {
    logger.error("[slack] 알림 전송 실패", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Info 레벨 Slack 알림 헬퍼
 */
export async function logInfo(title, text) {
  return notifySlack({
    title,
    text,
    level: "info",
  });
}

/**
 * Error 레벨 Slack 알림 헬퍼
 */
export async function logError(title, text) {
  return notifySlack({
    title,
    text,
    level: "error",
  });
}


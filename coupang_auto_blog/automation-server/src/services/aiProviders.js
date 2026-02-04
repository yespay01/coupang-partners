/**
 * 다중 AI 제공자 클라이언트
 * - OpenAI
 * - Anthropic (Claude)
 * - Google (Gemini)
 */

import { logger } from "../utils/logger.js";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * OpenAI 클라이언트로 텍스트 생성
 */
async function generateWithOpenAI(config, prompt, systemPrompt) {
  const { apiKey, model, temperature, maxTokens } = config;

  if (!apiKey) {
    throw new Error("OpenAI API 키가 설정되지 않았습니다.");
  }

  const client = new OpenAI({ apiKey });

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    messages,
  });

  const text = response.choices?.[0]?.message?.content?.trim();
  const usage = response.usage ?? {};

  return {
    text,
    usage: {
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
    },
    provider: "openai",
    model,
  };
}

/**
 * Anthropic (Claude) 클라이언트로 텍스트 생성
 */
async function generateWithAnthropic(config, prompt, systemPrompt) {
  const { apiKey, model, temperature, maxTokens } = config;

  if (!apiKey) {
    throw new Error("Anthropic API 키가 설정되지 않았습니다.");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt || undefined,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content?.[0]?.type === "text" ? response.content[0].text : "";
  const usage = response.usage ?? {};

  return {
    text: text.trim(),
    usage: {
      promptTokens: usage.input_tokens ?? 0,
      completionTokens: usage.output_tokens ?? 0,
      totalTokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
    },
    provider: "anthropic",
    model,
  };
}

/**
 * Google (Gemini) 클라이언트로 텍스트 생성
 */
async function generateWithGoogle(config, prompt, systemPrompt) {
  const { apiKey, model, temperature, maxTokens } = config;

  if (!apiKey) {
    throw new Error("Google API 키가 설정되지 않았습니다.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  // 시스템 프롬프트와 사용자 프롬프트 결합
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const result = await geminiModel.generateContent(fullPrompt);
  const response = result.response;
  const text = response.text();

  // finish reason 확인
  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason;

  logger.info("Gemini 응답 정보", {
    textLength: text.length,
    finishReason,
    safetyRatings: candidate?.safetyRatings,
  });

  // finishReason이 STOP이 아니면 경고
  if (finishReason && finishReason !== "STOP") {
    logger.warn(`Gemini 응답이 비정상적으로 종료됨: ${finishReason}`);
  }

  // Gemini는 토큰 사용량을 직접 제공하지 않음
  return {
    text: text.trim(),
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
    provider: "google",
    model,
  };
}

/**
 * AI 설정으로 텍스트 생성
 * @param {Object} aiSettings - system_settings의 ai 섹션
 * @param {string} prompt - 사용자 프롬프트
 * @param {string} systemPrompt - 시스템 프롬프트 (선택)
 */
export async function generateText(aiSettings, prompt, systemPrompt = "") {
  const { defaultProvider, temperature, maxTokens } = aiSettings;
  const providerConfig = aiSettings[defaultProvider];

  if (!providerConfig || !providerConfig.apiKey) {
    throw new Error(`${defaultProvider} 제공자 설정이 올바르지 않습니다.`);
  }

  const config = {
    apiKey: providerConfig.apiKey,
    model: providerConfig.model,
    temperature,
    maxTokens,
  };

  logger.info(`AI 텍스트 생성: ${defaultProvider} / ${providerConfig.model}`);

  switch (defaultProvider) {
    case "openai":
      return generateWithOpenAI(config, prompt, systemPrompt);
    case "anthropic":
      return generateWithAnthropic(config, prompt, systemPrompt);
    case "google":
      return generateWithGoogle(config, prompt, systemPrompt);
    default:
      throw new Error(`지원하지 않는 AI 제공자: ${defaultProvider}`);
  }
}

/**
 * 특정 제공자로 텍스트 생성 (폴백용)
 */
export async function generateTextWithProvider(provider, providerConfig, prompt, systemPrompt = "") {
  const config = {
    apiKey: providerConfig.apiKey,
    model: providerConfig.model,
    temperature: providerConfig.temperature ?? 0.7,
    maxTokens: providerConfig.maxTokens ?? 1024,
  };

  switch (provider) {
    case "openai":
      return generateWithOpenAI(config, prompt, systemPrompt);
    case "anthropic":
      return generateWithAnthropic(config, prompt, systemPrompt);
    case "google":
      return generateWithGoogle(config, prompt, systemPrompt);
    default:
      throw new Error(`지원하지 않는 AI 제공자: ${provider}`);
  }
}

/**
 * AI 제공자 연결 테스트
 */
export async function testAIProvider(provider, apiKey, model) {
  const testPrompt = "Hello, please respond with 'OK' to confirm the connection.";

  try {
    const config = {
      apiKey,
      model,
      temperature: 0.1,
      maxTokens: 10,
    };

    let result;
    switch (provider) {
      case "openai":
        result = await generateWithOpenAI(config, testPrompt, "");
        break;
      case "anthropic":
        result = await generateWithAnthropic(config, testPrompt, "");
        break;
      case "google":
        result = await generateWithGoogle(config, testPrompt, "");
        break;
      default:
        return { success: false, message: `지원하지 않는 제공자: ${provider}` };
    }

    return {
      success: true,
      message: "연결 성공",
      response: result.text,
    };
  } catch (error) {
    logger.error(`AI 제공자 테스트 실패 (${provider}):`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "연결 실패",
    };
  }
}

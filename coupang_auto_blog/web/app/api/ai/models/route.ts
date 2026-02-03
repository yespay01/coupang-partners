import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * GET /api/ai/models?provider=openai&apiKey=xxx
 * AI 제공자별 사용 가능한 모델 목록 조회
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider");
  const apiKey = searchParams.get("apiKey");

  if (!provider || !apiKey) {
    return NextResponse.json(
      { success: false, message: "provider와 apiKey가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    let models: { value: string; label: string }[] = [];

    switch (provider) {
      case "openai":
        models = await fetchOpenAIModels(apiKey);
        break;
      case "google":
        models = await fetchGoogleModels(apiKey);
        break;
      case "anthropic":
        // Anthropic은 모델 목록 API가 없으므로 문서 기반 목록 반환
        // https://docs.anthropic.com/en/docs/about-claude/models
        models = [
          { value: "claude-3-5-sonnet-20241022", label: "claude-3-5-sonnet-20241022" },
          { value: "claude-3-opus-20240229", label: "claude-3-opus-20240229" },
          { value: "claude-3-5-haiku-20241022", label: "claude-3-5-haiku-20241022" },
          { value: "claude-3-sonnet-20240229", label: "claude-3-sonnet-20240229" },
          { value: "claude-3-haiku-20240307", label: "claude-3-haiku-20240307" },
        ];
        break;
      default:
        return NextResponse.json(
          { success: false, message: "지원하지 않는 제공자입니다." },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      models,
    });
  } catch (error: any) {
    console.error(`모델 목록 조회 오류 (${provider}):`, error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "모델 목록 조회 실패",
      },
      { status: 500 }
    );
  }
}

/**
 * OpenAI 모델 목록 조회
 */
async function fetchOpenAIModels(apiKey: string) {
  const client = new OpenAI({ apiKey });
  const response = await client.models.list();

  // GPT 모델만 필터링 (채팅 완성용)
  const gptModels = response.data
    .filter((model) => {
      const id = model.id.toLowerCase();
      return (
        id.includes("gpt") &&
        !id.includes("instruct") &&
        !id.includes("vision") &&
        !id.includes("audio")
      );
    })
    .map((model) => ({
      value: model.id,
      label: model.id, // 모델 ID 그대로 표시
    }))
    .sort((a, b) => {
      // GPT-4 모델을 먼저, 그 다음 GPT-3.5
      const priority: Record<string, number> = {
        "gpt-4o": 1,
        "gpt-4o-mini": 2,
        "gpt-4-turbo": 3,
        "gpt-4": 4,
        "gpt-3.5-turbo": 5,
      };

      const priorityA = priority[a.value] || 999;
      const priorityB = priority[b.value] || 999;

      return priorityA - priorityB;
    });

  if (gptModels.length === 0) {
    throw new Error("사용 가능한 GPT 모델이 없습니다");
  }

  return gptModels;
}

/**
 * Google Gemini 모델 목록 조회 (REST API 직접 호출)
 */
async function fetchGoogleModels(apiKey: string) {
  // REST API로 직접 호출
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`Google API 호출 실패: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // generateContent를 지원하는 gemini 모델만 필터링
  const geminiModels = (data.models || [])
    .filter((model: any) => {
      return (
        model.supportedGenerationMethods?.includes("generateContent") &&
        model.name.includes("gemini") &&
        !model.name.includes("vision") &&
        !model.name.includes("imagen") &&
        !model.name.includes("embedding")
      );
    })
    .map((model: any) => {
      // "models/gemini-2.5-flash" -> "gemini-2.5-flash"
      const modelId = model.name.replace("models/", "");
      return {
        value: modelId,
        label: `${model.displayName || modelId}`,
        description: model.description || "",
      };
    })
    .sort((a: any, b: any) => {
      // 최신 버전을 먼저 (2.5 > 2.0 > 1.5)
      const getVersion = (val: string) => {
        if (val.includes("2.5")) return 3;
        if (val.includes("2.0")) return 2;
        if (val.includes("1.5")) return 1;
        return 0;
      };
      return getVersion(b.value) - getVersion(a.value);
    });

  if (geminiModels.length === 0) {
    throw new Error("사용 가능한 Gemini 모델이 없습니다");
  }

  return geminiModels;
}


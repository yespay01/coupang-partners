import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";

/**
 * POST /api/ai/models
 * AI 제공자별 사용 가능한 모델 목록 조회
 * body: { provider: string, apiKey: string }
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");

  if (!sessionCookie) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: { provider?: string; apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "잘못된 요청 본문입니다." },
      { status: 400 }
    );
  }

  const { provider, apiKey } = body;

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

async function fetchOpenAIModels(apiKey: string) {
  const client = new OpenAI({ apiKey });
  const response = await client.models.list();

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
      label: model.id,
    }))
    .sort((a, b) => {
      const priority: Record<string, number> = {
        "gpt-4o": 1,
        "gpt-4o-mini": 2,
        "gpt-4-turbo": 3,
        "gpt-4": 4,
        "gpt-3.5-turbo": 5,
      };
      return (priority[a.value] || 999) - (priority[b.value] || 999);
    });

  if (gptModels.length === 0) {
    throw new Error("사용 가능한 GPT 모델이 없습니다");
  }

  return gptModels;
}

async function fetchGoogleModels(apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`Google API 호출 실패: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

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
      const modelId = model.name.replace("models/", "");
      return {
        value: modelId,
        label: `${model.displayName || modelId}`,
        description: model.description || "",
      };
    })
    .sort((a: any, b: any) => {
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

import { NextRequest, NextResponse } from "next/server";
import {
  getGoldboxProducts,
  searchProducts,
  getBestCategoryProducts,
  getCoupangPLProducts,
  type CoupangConfig,
  type CoupangProduct,
} from "@/lib/coupang";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function POST(request: NextRequest) {
  try {
    const { source, limit = 5, categoryId, brandId, keyword } = await request.json();

    // 1. automation-server에서 시스템 설정 조회
    const settingsRes = await fetch(`${API_BASE}/api/admin/settings`, {
      headers: {
        Authorization: request.headers.get("Authorization") || "",
      },
    });

    if (!settingsRes.ok) {
      return NextResponse.json(
        { success: false, message: "시스템 설정 조회 실패" },
        { status: 500 }
      );
    }

    const settingsData = await settingsRes.json();

    if (!settingsData.success || !settingsData.data) {
      return NextResponse.json(
        { success: false, message: "시스템 설정이 없습니다." },
        { status: 400 }
      );
    }

    const { coupang } = settingsData.data;

    if (!coupang?.enabled || !coupang.accessKey || !coupang.secretKey) {
      return NextResponse.json(
        { success: false, message: "쿠팡 API가 설정되지 않았습니다." },
        { status: 400 }
      );
    }

    const config: CoupangConfig = {
      accessKey: coupang.accessKey,
      secretKey: coupang.secretKey,
    };

    let products: CoupangProduct[] = [];
    let sourceName = "";

    // 2. 소스별 API 호출
    switch (source) {
      case "goldbox":
        sourceName = "골드박스";
        products = await getGoldboxProducts(config);
        break;

      case "coupangPL":
        if (brandId) {
          sourceName = `쿠팡 PL (브랜드 ${brandId})`;
          products = await getCoupangPLProducts(brandId, limit, config);
        } else {
          return NextResponse.json(
            { success: false, message: "brandId가 필요합니다." },
            { status: 400 }
          );
        }
        break;

      case "category":
        if (!categoryId) {
          return NextResponse.json(
            { success: false, message: "categoryId가 필요합니다." },
            { status: 400 }
          );
        }
        sourceName = `카테고리 ${categoryId}`;
        products = await getBestCategoryProducts(categoryId, limit, config);
        break;

      case "keyword":
        if (!keyword) {
          return NextResponse.json(
            { success: false, message: "keyword가 필요합니다." },
            { status: 400 }
          );
        }
        sourceName = `키워드: ${keyword}`;
        products = await searchProducts(keyword, limit, config);
        break;

      default:
        return NextResponse.json(
          { success: false, message: "지원하지 않는 소스입니다." },
          { status: 400 }
        );
    }

    console.log(`${sourceName} 수집 성공: ${products.length}개`);

    return NextResponse.json({
      success: true,
      message: `${sourceName} 수집 성공`,
      source: sourceName,
      count: products.length,
      products: products.slice(0, limit),
    });
  } catch (error) {
    console.error("수집 테스트 오류:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "수집 중 오류 발생",
      },
      { status: 500 }
    );
  }
}

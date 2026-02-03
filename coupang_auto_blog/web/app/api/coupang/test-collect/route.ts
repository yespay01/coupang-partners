import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import {
  getGoldboxProducts,
  searchProducts,
  getBestCategoryProducts,
  getCoupangPLProducts,
  type CoupangConfig,
  type CoupangProduct,
} from "@/lib/coupang";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export async function POST(request: NextRequest) {
  try {
    const { source, limit = 5, categoryId, brandId, keyword } = await request.json();

    // 1. 시스템 설정 조회
    const settingsRef = doc(db, "system_settings", "global");
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      return NextResponse.json(
        { success: false, message: "시스템 설정이 없습니다." },
        { status: 400 }
      );
    }

    const settings = settingsDoc.data();
    const { coupang } = settings as any;

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

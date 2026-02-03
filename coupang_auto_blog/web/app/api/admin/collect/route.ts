import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, Timestamp, collection, addDoc } from "firebase/firestore";
import {
  getGoldboxProducts,
  searchProducts,
  getBestCategoryProducts,
  getCoupangPLProducts,
  createDeeplink,
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

// 상품 저장
async function saveProduct(
  product: CoupangProduct,
  source: string,
  config: CoupangConfig
): Promise<boolean> {
  try {
    const productId = String(product.productId);
    const productRef = doc(db, "products", productId);
    const existing = await getDoc(productRef);

    if (existing.exists()) {
      console.log(`[중복] 상품 이미 존재: ${productId} - ${product.productName}`);
      return false; // 이미 존재
    }

    // 딥링크 생성
    const affiliateUrl = await createDeeplink(product.productUrl, config);

    await setDoc(productRef, {
      productId: productId,
      productName: product.productName,
      productPrice: product.productPrice,
      productImage: product.productImage,
      productUrl: product.productUrl,
      affiliateUrl: affiliateUrl,
      categoryId: product.categoryId || "",
      categoryName: product.categoryName || "",
      source,
      createdAt: Timestamp.now(),
      status: "pending",
    });

    console.log(`[저장 성공] ${productId} - ${product.productName}`);
    return true; // 저장 성공
  } catch (error) {
    console.error(`[저장 실패] ${product.productId}:`, error);
    return false;
  }
}

/**
 * 수동 상품 수집 API
 * POST /api/admin/collect
 */
export async function POST(request: NextRequest) {
  try {
    const { maxProducts = 10 } = await request.json();

    // 시스템 설정 조회
    const settingsRef = doc(db, "system_settings", "global");
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      return NextResponse.json(
        { success: false, message: "시스템 설정이 없습니다." },
        { status: 400 }
      );
    }

    const settings = settingsDoc.data();
    const { coupang, topics } = settings as any;

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

    let totalCollected = 0;
    const stats = { goldbox: 0, categories: 0, keywords: 0, coupangPL: 0 };

    // 1. 골드박스 수집 (20%)
    const goldboxEnabled = topics?.goldboxEnabled ?? true;
    if (goldboxEnabled) {
      const goldboxLimit = Math.floor(maxProducts * 0.2);
      console.log(`[골드박스 수집] 할당: ${goldboxLimit}개`);

      const products = await getGoldboxProducts(config);
      for (const product of products.slice(0, goldboxLimit)) {
        if (totalCollected >= maxProducts) break;
        const saved = await saveProduct(product, "goldbox", config);
        if (saved) {
          stats.goldbox++;
          totalCollected++;
        }
      }
      console.log(`[골드박스 수집] 완료: ${stats.goldbox}개 수집`);
    }

    // 2. 키워드 수집 (30%)
    const keywords = topics?.keywords || [];
    if (keywords.length > 0) {
      const keywordAllocation = Math.floor(maxProducts * 0.3);
      const remaining = Math.max(0, maxProducts - totalCollected);
      const actualAllocation = Math.min(keywordAllocation, remaining);

      if (actualAllocation <= 0) {
        console.log(`[키워드 수집] 건너뜀: 할당량 부족 (${actualAllocation})`);
      } else {
        const limit = Math.max(1, Math.floor(actualAllocation / keywords.length));
        console.log(`[키워드 수집] 할당: ${actualAllocation}개, 키워드당: ${limit}개`);

        for (const keyword of keywords) {
          if (totalCollected >= maxProducts) break;
          const products = await searchProducts(keyword, limit, config);
          for (const product of products.slice(0, limit)) {
            if (totalCollected >= maxProducts) break;
            const saved = await saveProduct(product, `keyword:${keyword}`, config);
            if (saved) {
              stats.keywords++;
              totalCollected++;
            }
          }
        }
      }
    }

    // 3. 카테고리 베스트 수집 (40%)
    const enabledCategories = (topics?.categories || []).filter((cat: any) => cat.enabled);
    console.log(`[카테고리 수집] 활성화된 카테고리 수: ${enabledCategories.length}`, enabledCategories);
    if (enabledCategories.length > 0) {
      const categoryAllocation = Math.floor(maxProducts * 0.4);
      const remaining = Math.max(0, maxProducts - totalCollected);
      const actualAllocation = Math.min(categoryAllocation, remaining);

      if (actualAllocation <= 0) {
        console.log(`[카테고리 수집] 건너뜀: 할당량 부족 (${actualAllocation})`);
      } else {
        const limit = Math.max(1, Math.floor(actualAllocation / enabledCategories.length));
        console.log(`[카테고리 수집] 할당: ${actualAllocation}개, 카테고리당: ${limit}개`);

        for (const category of enabledCategories) {
          if (totalCollected >= maxProducts) break;
          const products = await getBestCategoryProducts(category.id, limit, config);
          for (const product of products.slice(0, limit)) {
            if (totalCollected >= maxProducts) break;
            const saved = await saveProduct(product, `category:${category.name}`, config);
            if (saved) {
              stats.categories++;
              totalCollected++;
            }
          }
        }
      }
    }

    // 4. 쿠팡 PL 브랜드 수집 (10%)
    const coupangPLBrands = topics?.coupangPLBrands || [];
    console.log(`[쿠팡 PL 수집] 선택된 브랜드 수: ${coupangPLBrands.length}`, coupangPLBrands);
    if (coupangPLBrands.length > 0) {
      const plAllocation = Math.floor(maxProducts * 0.1);
      const remaining = Math.max(0, maxProducts - totalCollected);
      const actualAllocation = Math.min(plAllocation, remaining);

      if (actualAllocation <= 0) {
        console.log(`[쿠팡 PL 수집] 건너뜀: 할당량 부족 (${actualAllocation})`);
      } else {
        const limit = Math.max(1, Math.floor(actualAllocation / coupangPLBrands.length));
        console.log(`[쿠팡 PL 수집] 할당: ${actualAllocation}개, 브랜드당: ${limit}개`);

        for (const brandId of coupangPLBrands) {
          if (totalCollected >= maxProducts) break;
          const products = await getCoupangPLProducts(brandId, limit, config);
          for (const product of products.slice(0, limit)) {
            if (totalCollected >= maxProducts) break;
            const saved = await saveProduct(product, `coupangPL:${brandId}`, config);
            if (saved) {
              stats.coupangPL++;
              totalCollected++;
            }
          }
        }
      }
    }

    // 로그 기록
    await addDoc(collection(db, "logs"), {
      type: "collection",
      level: "info",
      message: `수동 상품 수집 완료: ${totalCollected}개`,
      context: JSON.stringify({
        totalCollected,
        stats,
        source: "manual",
      }),
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: `${totalCollected}개의 상품이 수집되었습니다.`,
      data: {
        totalCollected,
        stats,
      },
    });
  } catch (error) {
    console.error("수집 오류:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "수집 중 오류 발생",
      },
      { status: 500 }
    );
  }
}

/**
 * 수집 상태 조회
 * GET /api/admin/collect
 *
 * TODO: Firebase Admin SDK 자격 증명 설정 후 Firestore 직접 조회로 전환
 * 현재는 클라이언트에서 직접 조회하도록 임시 응답 반환
 */
export async function GET() {
  try {
    // 임시 응답 - 클라이언트에서 직접 Firestore를 조회하도록 함
    return NextResponse.json({
      success: true,
      data: {
        totalProducts: 0,
        recentProducts: [],
        sourceStats: {},
        recentLogs: [],
      },
      message: "클라이언트에서 직접 Firestore를 조회하세요",
    });
  } catch (error) {
    console.error("조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "조회 중 오류 발생",
      },
      { status: 500 }
    );
  }
}

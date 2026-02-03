/**
 * 상품 수집 테스트 스크립트
 * 로컬에서 수집 기능을 테스트합니다.
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createCoupangClient } from "./coupang/index.js";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * 시스템 설정 조회
 */
async function getSystemSettings() {
  const docRef = db.collection("system_settings").doc("global");
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    console.log("❌ 시스템 설정이 없습니다.");
    return null;
  }

  return docSnap.data();
}

/**
 * 골드박스 테스트
 */
async function testGoldbox(client) {
  console.log("\n=== 골드박스 테스트 ===");
  try {
    const result = await client.getGoldboxProducts();
    console.log(`✅ 골드박스 조회 성공: ${result.products?.length || 0}개`);
    if (result.products && result.products.length > 0) {
      console.log("첫 번째 상품:", result.products[0].productName);
    }
    return result;
  } catch (error) {
    console.error("❌ 골드박스 조회 실패:", error.message);
    return { success: false, products: [] };
  }
}

/**
 * 쿠팡 PL 전체 테스트
 */
async function testCoupangPL(client) {
  console.log("\n=== 쿠팡 PL 전체 테스트 ===");
  try {
    const result = await client.getCoupangPLProducts(5);
    console.log(`✅ 쿠팡 PL 조회 성공: ${result.products?.length || 0}개`);
    if (result.products && result.products.length > 0) {
      console.log("첫 번째 상품:", result.products[0].productName);
    }
    return result;
  } catch (error) {
    console.error("❌ 쿠팡 PL 조회 실패:", error.message);
    return { success: false, products: [] };
  }
}

/**
 * 쿠팡 PL 브랜드별 테스트
 */
async function testCoupangPLBrand(client, brandId = "1001") {
  console.log(`\n=== 쿠팡 PL 브랜드(${brandId}) 테스트 ===`);
  try {
    const result = await client.getCoupangPLBrandProducts(brandId, 5);
    console.log(`✅ 쿠팡 PL 브랜드 조회 성공: ${result.products?.length || 0}개`);
    if (result.products && result.products.length > 0) {
      console.log("첫 번째 상품:", result.products[0].productName);
    }
    return result;
  } catch (error) {
    console.error("❌ 쿠팡 PL 브랜드 조회 실패:", error.message);
    return { success: false, products: [] };
  }
}

/**
 * 베스트 상품 테스트
 */
async function testBestProducts(client) {
  console.log("\n=== 카테고리 베스트 테스트 ===");
  try {
    const result = await client.getBestProducts("1001", 5); // 여성패션
    console.log(`✅ 베스트 상품 조회 성공: ${result.products?.length || 0}개`);
    if (result.products && result.products.length > 0) {
      console.log("첫 번째 상품:", result.products[0].productName);
    }
    return result;
  } catch (error) {
    console.error("❌ 베스트 상품 조회 실패:", error.message);
    return { success: false, products: [] };
  }
}

/**
 * 키워드 검색 테스트
 */
async function testSearchProducts(client) {
  console.log("\n=== 키워드 검색 테스트 ===");
  try {
    const result = await client.searchProducts("노트북", 5);
    console.log(`✅ 키워드 검색 성공: ${result.products?.length || 0}개`);
    if (result.products && result.products.length > 0) {
      console.log("첫 번째 상품:", result.products[0].productName);
    }
    return result;
  } catch (error) {
    console.error("❌ 키워드 검색 실패:", error.message);
    return { success: false, products: [] };
  }
}

/**
 * 메인 테스트 함수
 */
async function main() {
  console.log("🚀 상품 수집 API 테스트 시작\n");

  // 1. 설정 확인
  const settings = await getSystemSettings();
  if (!settings) {
    console.log("\n⚠️  먼저 관리자 페이지에서 시스템 설정을 완료해주세요.");
    process.exit(1);
  }

  console.log("✅ 시스템 설정 확인 완료");

  // 2. 쿠팡 API 설정 확인
  const { coupang } = settings;
  if (!coupang?.enabled || !coupang.accessKey || !coupang.secretKey) {
    console.log("\n⚠️  쿠팡 API가 설정되지 않았습니다.");
    console.log("관리자 페이지 > 설정 > 쿠팡 API에서 설정을 완료해주세요.");
    process.exit(1);
  }

  console.log("✅ 쿠팡 API 설정 확인 완료");
  console.log(`   - Partner ID: ${coupang.partnerId}`);
  console.log(`   - Sub ID: ${coupang.subId || "(없음)"}`);

  // 3. 클라이언트 생성
  const client = createCoupangClient(
    coupang.accessKey,
    coupang.secretKey,
    coupang.partnerId,
    coupang.subId
  );

  // 4. 각 API 테스트
  const results = {
    goldbox: await testGoldbox(client),
    coupangPL: await testCoupangPL(client),
    coupangPLBrand: await testCoupangPLBrand(client, "1001"), // 탐사
    bestProducts: await testBestProducts(client),
    searchProducts: await testSearchProducts(client),
  };

  // 5. 결과 요약
  console.log("\n=== 테스트 결과 요약 ===");
  console.log(`골드박스: ${results.goldbox.success ? "✅" : "❌"} (${results.goldbox.products?.length || 0}개)`);
  console.log(`쿠팡 PL 전체: ${results.coupangPL.success ? "✅" : "❌"} (${results.coupangPL.products?.length || 0}개)`);
  console.log(`쿠팡 PL 브랜드: ${results.coupangPLBrand.success ? "✅" : "❌"} (${results.coupangPLBrand.products?.length || 0}개)`);
  console.log(`카테고리 베스트: ${results.bestProducts.success ? "✅" : "❌"} (${results.bestProducts.products?.length || 0}개)`);
  console.log(`키워드 검색: ${results.searchProducts.success ? "✅" : "❌"} (${results.searchProducts.products?.length || 0}개)`);

  const successCount = Object.values(results).filter(r => r.success).length;
  console.log(`\n총 ${successCount}/5개 API 테스트 성공`);

  if (successCount === 5) {
    console.log("\n🎉 모든 API 테스트 성공! 자동 수집 기능이 정상 작동합니다.");
  } else {
    console.log("\n⚠️  일부 API 테스트 실패. 위 로그를 확인해주세요.");
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("\n❌ 테스트 실행 중 오류:", error);
  process.exit(1);
});

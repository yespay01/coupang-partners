import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "쿠팡 상품 가격 검색",
  description: "상품명으로 쿠팡 상품을 찾고 검색 결과의 가격과 조건을 비교한 뒤 현재 판매 정보를 확인하세요.",
  alternates: { canonical: "https://semolink.store/search" },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}

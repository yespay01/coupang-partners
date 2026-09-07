import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "쿠팡 최저가 검색 | 세모링크",
  description: "상품명으로 쿠팡 검색 결과를 찾고 결과 안에서 낮은 가격부터 비교하세요.",
  alternates: { canonical: "https://semolink.store/search" },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}

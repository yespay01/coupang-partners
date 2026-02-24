import { Metadata } from "next";

export const metadata: Metadata = {
  title: "요리 레시피",
  description: "다양한 요리 레시피와 함께 필요한 재료를 쿠팡에서 바로 구매하세요. 재료, 조리법, 조리시간을 한 번에 확인할 수 있습니다.",
  alternates: {
    canonical: "https://semolink.store/recipes",
  },
  openGraph: {
    title: "요리 레시피 | 세모링크",
    description: "다양한 요리 레시피와 함께 필요한 재료를 쿠팡에서 바로 구매하세요.",
    url: "https://semolink.store/recipes",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "요리 레시피 | 세모링크",
    description: "다양한 요리 레시피와 함께 필요한 재료를 쿠팡에서 바로 구매하세요.",
  },
};

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

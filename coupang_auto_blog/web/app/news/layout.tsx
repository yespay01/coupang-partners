import { Metadata } from "next";

export const metadata: Metadata = {
  title: "뉴스",
  description: "최신 소비 트렌드와 쇼핑 뉴스를 전해드립니다. 생활에 유용한 정보와 할인 소식을 확인하세요.",
  alternates: {
    canonical: "https://semolink.store/news",
  },
  openGraph: {
    title: "뉴스 | 세모링크",
    description: "최신 소비 트렌드와 쇼핑 뉴스를 전해드립니다.",
    url: "https://semolink.store/news",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "뉴스 | 세모링크",
    description: "최신 소비 트렌드와 쇼핑 뉴스를 전해드립니다.",
  },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

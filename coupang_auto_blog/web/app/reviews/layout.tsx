import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "상품 정보 | 세모링크",
  robots: { index: false, follow: false, nocache: true },
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getServerSiteBranding } from "@/lib/serverSiteBranding";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getServerSiteBranding();
  const siteName = site.name || "세모링크";

  return {
    title: `제휴/광고 고지 | ${siteName}`,
    description: `${siteName} 제휴/광고 고지 안내 페이지`,
    robots: { index: false, follow: true },
  };
}

export default async function DisclosurePage() {
  const site = await getServerSiteBranding();
  const siteName = site.name || "세모링크";
  const disclosure =
    site.affiliateDisclosureText ||
    "이 사이트의 일부 콘텐츠에는 제휴 링크가 포함될 수 있으며, 이를 통해 일정 수수료를 받을 수 있습니다.";

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 pt-32 pb-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10">
          <h1 className="text-3xl font-bold text-slate-900">제휴 / 광고 고지</h1>
          <p className="mt-3 text-sm text-slate-500">{siteName} 운영 정책 안내</p>

          <div className="prose prose-slate mt-8 max-w-none">
            <p>{disclosure}</p>
            <h2>1. 제휴 링크 안내</h2>
            <p>
              콘텐츠 내 링크를 통해 제휴사 페이지로 이동하거나 구매가 발생할 경우, 운영자에게 일정 수수료가 지급될 수 있습니다.
            </p>
            <h2>2. 편집 독립성</h2>
            <p>
              콘텐츠 선정과 작성은 운영 기준에 따라 이루어지며, 제휴 여부가 내용 전부를 결정하지 않도록 운영합니다.
            </p>
            <h2>3. 가격/재고 정보</h2>
            <p>
              상품 가격 및 재고는 외부 판매처 정책에 따라 변동될 수 있으며, 최종 정보는 판매처 페이지에서 확인해야 합니다.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

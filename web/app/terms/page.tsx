import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getServerSiteBranding } from "@/lib/serverSiteBranding";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getServerSiteBranding();
  const siteName = site.name || "세모링크";

  return {
    title: `이용약관 | ${siteName}`,
    description: `${siteName} 서비스 이용약관 안내 페이지`,
    robots: { index: false, follow: true },
  };
}

export default async function TermsPage() {
  const site = await getServerSiteBranding();
  const siteName = site.name || "세모링크";
  const operatorName = site.businessName || siteName;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 pt-32 pb-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10">
          <h1 className="text-3xl font-bold text-slate-900">이용약관</h1>
          <p className="mt-3 text-sm text-slate-500">최종 수정일: {new Date().toLocaleDateString("ko-KR")}</p>

          <div className="prose prose-slate mt-8 max-w-none">
            <p>
              본 약관은 {operatorName}(이하 "운영자")가 운영하는 {siteName}의 서비스 이용조건 및 운영 기준을 규정하는 기본 템플릿입니다.
              실제 운영 전 서비스 성격에 맞게 수정하고 법률 검토 후 사용하세요.
            </p>

            <h2>1. 서비스의 성격</h2>
            <p>{siteName}는 상품/레시피/뉴스 등 정보성 콘텐츠를 제공하는 사이트입니다.</p>

            <h2>2. 이용자의 책임</h2>
            <ul>
              <li>서비스 이용 시 관련 법령을 준수해야 합니다.</li>
              <li>서비스 운영을 방해하는 행위를 해서는 안 됩니다.</li>
            </ul>

            <h2>3. 면책</h2>
            <p>
              운영자는 제공 정보의 최신성/정확성 확보를 위해 노력하지만, 외부 서비스/상품 정보 변경에 따라 내용이 달라질 수 있습니다.
            </p>

            <h2>4. 약관 변경</h2>
            <p>운영자는 서비스 운영상 필요한 경우 약관을 변경할 수 있으며, 변경사항은 사이트를 통해 공지할 수 있습니다.</p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

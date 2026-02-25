import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getServerSiteBranding } from "@/lib/serverSiteBranding";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getServerSiteBranding();
  const siteName = site.name || "세모링크";

  return {
    title: `개인정보처리방침 | ${siteName}`,
    description: `${siteName} 개인정보처리방침 안내 페이지`,
    robots: { index: false, follow: true },
  };
}

export default async function PrivacyPage() {
  const site = await getServerSiteBranding();
  const siteName = site.name || "세모링크";
  const operatorName = site.businessName || siteName;
  const contactEmail = site.contactEmail || "[문의 이메일 입력]";

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 pt-32 pb-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10">
          <h1 className="text-3xl font-bold text-slate-900">개인정보처리방침</h1>
          <p className="mt-3 text-sm text-slate-500">최종 수정일: {new Date().toLocaleDateString("ko-KR")}</p>

          <div className="prose prose-slate mt-8 max-w-none">
            <p>
              본 개인정보처리방침은 {operatorName}(이하 "운영자")가 운영하는 {siteName}에서 제공하는 서비스와 관련하여
              개인정보 처리 기준을 안내하기 위한 기본 템플릿입니다. 실제 운영 전 법률 검토 후 수정하여 사용하세요.
            </p>

            <h2>1. 수집하는 정보</h2>
            <p>운영자는 문의 응대, 서비스 운영, 보안 대응을 위해 필요한 최소한의 정보를 수집할 수 있습니다.</p>

            <h2>2. 이용 목적</h2>
            <ul>
              <li>문의 응대 및 공지 전달</li>
              <li>서비스 운영 및 보안 점검</li>
              <li>법령 준수 및 분쟁 대응</li>
            </ul>

            <h2>3. 보관 및 파기</h2>
            <p>개인정보는 수집·이용 목적 달성 후 지체 없이 파기하며, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관할 수 있습니다.</p>

            <h2>4. 문의처</h2>
            <p>개인정보 관련 문의: {contactEmail}</p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

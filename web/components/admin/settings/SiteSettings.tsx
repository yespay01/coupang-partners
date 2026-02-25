"use client";

import { useSettingsStore } from "@/stores/settingsStore";
import { DEFAULT_SETTINGS } from "@/types/settings";

export function SiteSettings() {
  const { settings } = useSettingsStore();
  const site = settings.site || DEFAULT_SETTINGS.site;

  const updateSite = (updates: Partial<typeof site>) => {
    useSettingsStore.setState((state) => ({
      settings: {
        ...state.settings,
        site: {
          ...(state.settings.site || DEFAULT_SETTINGS.site),
          ...updates,
        },
      },
      hasUnsavedChanges: true,
    }));
  };

  const fields: Array<{
    key: keyof typeof site;
    label: string;
    placeholder?: string;
    rows?: number;
    help?: string;
  }> = [
    { key: "name", label: "사이트명", placeholder: "예: 세모링크" },
    { key: "tagline", label: "태그라인", placeholder: "예: 세상의 모든 링크가 모이는 허브" },
    { key: "domain", label: "도메인(표시용)", placeholder: "https://example.com", help: "SEO/캐노니컬 기준 URL은 현재 ENV(NEXT_PUBLIC_SITE_URL)를 우선 사용합니다." },
    { key: "logoUrl", label: "로고 URL", placeholder: "/logo.png" },
    { key: "faviconUrl", label: "파비콘 URL", placeholder: "/icon.png" },
    { key: "appleTouchIconUrl", label: "Apple Touch Icon URL", placeholder: "/apple-touch-icon.png" },
    { key: "ogDefaultImageUrl", label: "OG 기본 이미지 URL", placeholder: "https://example.com/og.png" },
    { key: "contactEmail", label: "문의 이메일", placeholder: "admin@example.com" },
    { key: "businessName", label: "사업자/운영자명", placeholder: "예: 세모링크 운영팀" },
    { key: "privacyPolicyUrl", label: "개인정보처리방침 URL", placeholder: "/privacy 또는 https://example.com/privacy" },
    { key: "termsUrl", label: "이용약관 URL", placeholder: "/terms 또는 https://example.com/terms" },
    { key: "disclosureUrl", label: "제휴/광고 고지 페이지 URL", placeholder: "/disclosure 또는 https://example.com/disclosure" },
    { key: "defaultMetaTitle", label: "기본 메타 타이틀", placeholder: "사이트 기본 타이틀" },
    { key: "defaultMetaDescription", label: "기본 메타 설명", placeholder: "사이트 기본 메타 설명", rows: 3 },
    { key: "footerCopyright", label: "푸터 카피라이트", placeholder: "© 2026 ...", rows: 2 },
    { key: "affiliateDisclosureText", label: "제휴/광고 고지 문구", placeholder: "이 포스트는 ... 수수료를 받을 수 있습니다.", rows: 3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">사이트 정보 / 브랜딩</h2>
        <p className="mt-1 text-sm text-slate-500">
          사이트명, 로고, 파비콘, 메타 기본값, 푸터 문구 등 설치형 고객별 브랜딩 정보를 관리합니다.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-medium">운영 원칙</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-blue-700">
          <li>도메인(SEO 기준 URL)은 ENV `NEXT_PUBLIC_SITE_URL` 우선</li>
          <li>브랜딩 문구/로고/푸터는 설정값(DB)으로 관리</li>
          <li>향후 설치형/관리형 표준화 및 SaaS 확장에 재사용</li>
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const isTextArea = Boolean(field.rows);
          const value = (site[field.key] as string) || "";

          return (
            <div key={field.key} className={isTextArea ? "sm:col-span-2 space-y-2" : "space-y-2"}>
              <label className="block text-sm font-medium text-slate-700">{field.label}</label>
              {isTextArea ? (
                <textarea
                  rows={field.rows}
                  value={value}
                  onChange={(e) => updateSite({ [field.key]: e.target.value } as Partial<typeof site>)}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updateSite({ [field.key]: e.target.value } as Partial<typeof site>)}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
              {field.help && <p className="text-xs text-slate-500">{field.help}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

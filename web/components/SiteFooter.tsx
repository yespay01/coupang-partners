"use client";

import Link from "next/link";
import { useSiteBranding } from "@/hooks/useSiteBranding";

function FooterLegalLink({ href, label }: { href?: string; label: string }) {
  if (!href) {
    return <span className="opacity-50">{label}</span>;
  }

  const commonClass = "hover:text-slate-900 transition-colors";

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={commonClass}>
        {label}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={commonClass}>
      {label}
    </a>
  );
}

const navItems = [
  { label: "리뷰", href: "/" },
  { label: "요리", href: "/recipes" },
  { label: "뉴스", href: "/news" },
  { label: "검색", href: "/search" },
];

export function SiteFooter() {
  const { site } = useSiteBranding();
  const siteName = site.name || "세모링크";
  const tagline = site.tagline || "세상의 모든 링크가 모이는 허브";
  const footerCopyright =
    site.footerCopyright || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`;

  return (
    <footer className="bg-white pt-40 pb-20 border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-8 lg:px-16">
        <div className="grid gap-24 lg:grid-cols-3 mb-40">
          <div className="lg:col-span-1">
            <img src={site.logoUrl || "/logo.png"} alt={siteName} className="h-10 w-auto mb-8" />
            <p className="text-slate-400 text-base font-serif italic leading-relaxed opacity-80">
              {tagline}
            </p>
            {site.affiliateDisclosureText && (
              <p className="mt-6 text-xs leading-relaxed text-slate-400">
                {site.affiliateDisclosureText}
              </p>
            )}
          </div>

          <div className="lg:col-span-2 grid gap-16 grid-cols-2 md:grid-cols-3">
            <div>
              <h4 className="text-[11px] font-black tracking-[0.4em] uppercase text-slate-900 mb-10">NAVIGATE</h4>
              <ul className="space-y-5 text-[10px] font-black tracking-[0.3em] uppercase text-slate-400">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="hover:text-amber-800 transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-black tracking-[0.4em] uppercase text-slate-900 mb-10">SITE</h4>
              <ul className="space-y-5 text-[10px] font-black tracking-[0.3em] uppercase text-slate-400">
                {site.businessName && <li className="break-all">{site.businessName}</li>}
                {site.contactEmail && <li className="break-all normal-case tracking-normal">{site.contactEmail}</li>}
                {site.domain && <li className="break-all normal-case tracking-normal">{site.domain}</li>}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-black tracking-[0.4em] uppercase text-slate-900 mb-10">LEGAL</h4>
              <ul className="space-y-5 text-[10px] font-black tracking-[0.3em] uppercase text-slate-400">
                <li><FooterLegalLink href={site.privacyPolicyUrl} label="Privacy" /></li>
                <li><FooterLegalLink href={site.termsUrl} label="Terms" /></li>
                <li><FooterLegalLink href={site.disclosureUrl} label="Disclosure" /></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-16 border-t border-slate-100 text-[10px] font-black tracking-[0.4em] uppercase text-slate-300">
          <p>{footerCopyright}</p>
          <p className="opacity-50 italic">{siteName}</p>
        </div>
      </div>
    </footer>
  );
}

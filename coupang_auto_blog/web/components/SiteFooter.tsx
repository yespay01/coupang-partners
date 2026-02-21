import Link from "next/link";

const navItems = [
  { label: "리뷰", href: "/" },
  { label: "요리", href: "/recipes" },
  { label: "뉴스", href: "/news" },
  { label: "검색", href: "/search" },
];

export function SiteFooter() {
  return (
    <footer className="bg-white pt-40 pb-20 border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-8 lg:px-16">
        <div className="grid gap-24 lg:grid-cols-3 mb-40">
          <div className="lg:col-span-1">
            <img src="/logo.png" alt="세모링크" className="h-10 w-auto mb-8" />
            <p className="text-slate-400 text-base font-serif italic leading-relaxed opacity-80">
              Semolink는 가치 있는 소비와 일상의 발견을 기록하는 전문 아카이브입니다.
              수많은 선택지 속에서 진정한 탁월함을 찾아내는 당신의 안목을 위해
              우리는 가장 좋은 것만을 선별하여 기록합니다.
            </p>
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
              <h4 className="text-[11px] font-black tracking-[0.4em] uppercase text-slate-900 mb-10">ABOUT</h4>
              <ul className="space-y-5 text-[10px] font-black tracking-[0.3em] uppercase text-slate-400">
                <li className="hover:text-slate-900 cursor-pointer">Curation Policy</li>
                <li className="hover:text-slate-900 cursor-pointer">Brand Story</li>
                <li className="hover:text-slate-900 cursor-pointer">Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-black tracking-[0.4em] uppercase text-slate-900 mb-10">LEGAL</h4>
              <ul className="space-y-5 text-[10px] font-black tracking-[0.3em] uppercase text-slate-400">
                <li className="hover:text-slate-900 cursor-pointer">Privacy</li>
                <li className="hover:text-slate-900 cursor-pointer">Terms</li>
                <li className="hover:text-slate-900 cursor-pointer text-amber-700">Instagram</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-16 border-t border-slate-100 text-[10px] font-black tracking-[0.4em] uppercase text-slate-300">
          <p>&copy; {new Date().getFullYear()} SEMOLINK ARCHIVE. ALL RIGHTS RESERVED.</p>
          <p className="opacity-50 italic">CURATED WITH EXCELLENCE IN SEOUL</p>
        </div>
      </div>
    </footer>
  );
}

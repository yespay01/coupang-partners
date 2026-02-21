import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function RecipesPage() {
  return (
    <div className="min-h-screen bg-white selection:bg-amber-50">
      <SiteHeader />
      <main className="pt-48 pb-32 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="text-[11px] font-black tracking-[0.6em] text-amber-800/60 mb-8 block uppercase">
            Coming Soon
          </span>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 mb-8">요리</h1>
          <p className="text-slate-400 font-serif italic text-lg md:text-xl max-w-md mx-auto leading-relaxed">
            레시피와 함께하는 쿠팡 제품 큐레이션.<br />
            곧 찾아오겠습니다.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

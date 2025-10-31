import Link from "next/link";

const automationTimeline = [
  { time: "02:00", title: "상품 자동 수집", description: "쿠팡 API에서 신규 상품 메타 데이터를 가져옵니다." },
  { time: "02:10", title: "AI 후기 생성", description: "OpenAI를 호출해 초안을 만들고 품질 규칙을 통과한 것만 저장합니다." },
  { time: "09:10", title: "승인 즉시 게시", description: "관리자 승인이 떨어지면 ISR 페이지와 sitemap을 자동 갱신합니다." },
  { time: "18:00", title: "수익 통계 갱신", description: "클릭/주문 데이터를 Firestore에 집계하고 로그로 추적합니다." },
];

const previewMetrics = [
  { label: "대기 중 상품", value: "24", hint: "검수 대기" },
  { label: "금일 생성 리뷰", value: "12", hint: "자동 생성 완료" },
  { label: "어제 대비 클릭", value: "+18%", hint: "리다이렉트 로그 기준" },
];

const featuredCategories = [
  { name: "라이프스타일", description: "생활용품·인테리어·조명 등 유저 체감도가 높은 카테고리" },
  { name: "디지털&가전", description: "가전/IT 제품 리뷰 및 스펙 비교 요약" },
  { name: "주방/쿠킹", description: "자취용 주방기기와 식기 추천 콘텐츠" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16 sm:px-8">
          <span className="w-fit rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Coupang Partners Automation
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            AI 기반 후기 생성과 검수 워크플로를 한 번에.
          </h1>
          <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
            상품 데이터 수집부터 메타데이터 갱신, 승인 후 게시까지 자동화 루틴을 통째로 제공하는 운영 대시보드
            초안을 준비했습니다. 지금은 더미 데이터지만, 파이어베이스와 연동되면 실시간으로 업데이트됩니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
              🔄 자동 수집 &amp; 재시도 큐
            </span>
            <span className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
              🤖 OpenAI 품질 규칙 적용
            </span>
            <span className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
              📊 수익 대시보드 예정
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              관리자 대시보드 보기
            </Link>
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white hover:shadow-sm"
            >
              Firebase 콘솔 열기
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[60vh] max-w-6xl flex-col gap-16 px-6 py-16 sm:px-8">
        <section className="grid gap-6 md:grid-cols-3">
          {previewMetrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-sm font-medium text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{metric.value}</p>
              <p className="mt-1 text-xs text-slate-500">{metric.hint}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-10 lg:grid-cols-[2fr,3fr]">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900">자동화 타임라인</h2>
            <p className="text-sm text-slate-600">
              README에 정의된 스케줄을 바탕으로 대략적인 오퍼레이션 흐름을 시각화했습니다. UI와 데이터는 이후
              파이어베이스 컬렉션과 연동할 예정입니다.
            </p>
            <ul className="space-y-3">
              {automationTimeline.map((step) => (
                <li key={step.time} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm font-mono text-slate-500">{step.time}</span>
                    <span className="text-base font-semibold text-slate-900">{step.title}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900">우선 구축 카테고리</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredCategories.map((category) => (
                <article key={category.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">{category.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">{category.description}</p>
                  <span className="mt-3 inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    콘텐츠 초안 준비 중
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Firebase 연동 체크포인트</h2>
          <p className="mt-3 text-sm text-slate-600">
            `.env.local`에 Firebase 웹 키를 추가하고 `lib/firebaseClient.ts`에서 초기화됩니다. 관리용 대시보드와
            공개 블로그 뷰를 위해 Auth 및 Firestore 모듈을 곧 연결할 예정입니다.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Coupang Partners Auto Blog Pilot</p>
          <p>이 페이지는 프로젝트 초기 껍데기(Scaffold)이며 이후 실제 데이터와 컴포넌트가 추가됩니다.</p>
        </div>
      </footer>
    </div>
  );
}

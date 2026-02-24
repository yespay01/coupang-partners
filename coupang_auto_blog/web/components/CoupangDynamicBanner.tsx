export function CoupangDynamicBanner({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div style={{ width: "100%", maxWidth: "680px", height: "140px", margin: "0 auto", overflow: "hidden" }}>
        <iframe
          src="https://ads-partners.coupang.com/widgets.html?id=967328&template=carousel&trackingCode=AF7225079&width=680&height=140"
          width="680"
          height="140"
          frameBorder={0}
          scrolling="no"
          referrerPolicy="unsafe-url"
          style={{ width: "100%", maxWidth: "680px", border: "none" }}
        />
      </div>
      <p className="mt-1 text-center text-xs text-slate-400">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
}

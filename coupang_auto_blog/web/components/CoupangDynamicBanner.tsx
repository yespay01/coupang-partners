export function CoupangDynamicBanner({ className = "" }: { className?: string }) {
  const bannerEnabled =
    process.env.NEXT_PUBLIC_COUPANG_DYNAMIC_BANNER_ENABLED === "true";
  const trackingCode = process.env.NEXT_PUBLIC_COUPANG_PARTNER_ID?.trim();

  // iframe 클릭은 /go 측정에 포함할 수 없으므로 명시적으로 허용할 때만 노출한다.
  if (!bannerEnabled || !trackingCode || !/^AF[0-9]+$/.test(trackingCode)) {
    return null;
  }

  const params = new URLSearchParams({
    id: "967328",
    template: "carousel",
    trackingCode,
    width: "680",
    height: "140",
  });

  return (
    <div className={className}>
      <div style={{ width: "100%", maxWidth: "680px", height: "140px", margin: "0 auto", overflow: "hidden" }}>
        <iframe
          src={`https://ads-partners.coupang.com/widgets.html?${params.toString()}`}
          width="680"
          height="140"
          frameBorder={0}
          scrolling="no"
          referrerPolicy="strict-origin-when-cross-origin"
          title="쿠팡 제휴 상품"
          style={{ width: "100%", maxWidth: "680px", border: "none" }}
        />
      </div>
    </div>
  );
}

export function AffiliateDisclosure({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-slate-500 ${className}`}>
      이 페이지는 쿠팡 파트너스 활동의 일환으로, 구매 시 일정액의
      수수료를 제공받을 수 있습니다.
    </p>
  );
}

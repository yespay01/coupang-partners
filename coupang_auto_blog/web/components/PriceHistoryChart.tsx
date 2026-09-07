export type PriceHistoryPoint = {
  businessDateKst: string;
  observedAt: string;
  priceKrw: number;
  currency: "KRW" | string;
  source: string;
};

function formatPrice(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(
    new Date(`${value}T00:00:00+09:00`),
  );
}

export function PriceHistoryChart({ points }: { points: PriceHistoryPoint[] }) {
  if (points.length < 2) return null;

  const width = 720;
  const height = 280;
  const padding = { top: 24, right: 24, bottom: 42, left: 72 };
  const prices = points.map((point) => point.priceKrw);
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const span = Math.max(maximum - minimum, Math.max(maximum * 0.05, 1));
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const coordinates = points.map((point, index) => {
    const x = padding.left + (index / Math.max(points.length - 1, 1)) * chartWidth;
    const y = padding.top + ((maximum - point.priceKrw) / span) * chartHeight;
    return { ...point, x, y };
  });
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[620px]"
          role="img"
          aria-label={`${formatDate(points[0].businessDateKst)}부터 ${formatDate(points.at(-1)!.businessDateKst)}까지의 실제 관측 가격 흐름`}
        >
          {[0, 0.5, 1].map((ratio) => {
            const y = padding.top + ratio * chartHeight;
            const value = Math.round(maximum - ratio * span);
            return (
              <g key={ratio}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />
                <text x={padding.left - 12} y={y + 4} textAnchor="end" fontSize="12" fill="#64748b">{formatPrice(value)}</text>
              </g>
            );
          })}
          <polyline points={line} fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {coordinates.map((point, index) => (
            <g key={`${point.businessDateKst}-${point.observedAt}`}>
              <circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#f97316" strokeWidth="3" />
              {(index === 0 || index === coordinates.length - 1) && (
                <text x={point.x} y={height - 12} textAnchor={index === 0 ? "start" : "end"} fontSize="12" fill="#475569">
                  {formatDate(point.businessDateKst)}
                </text>
              )}
              <title>{`${point.businessDateKst} ${formatPrice(point.priceKrw)}`}</title>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["관측 시작", formatPrice(points[0].priceKrw)],
          ["최신 관측", formatPrice(points.at(-1)!.priceKrw)],
          ["관측 최저", formatPrice(minimum)],
          ["관측 최고", formatPrice(maximum)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-extrabold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

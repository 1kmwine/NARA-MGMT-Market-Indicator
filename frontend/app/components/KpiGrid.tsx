import { changeColor, fmtPct, toMillion, yoyPct } from "@/lib/chart";
import type { AlcoholResponse, CsiResponse, FxResponse, IncomeResponse } from "@/lib/types";

interface Props {
  fx: FxResponse;
  csi: CsiResponse;
  income: IncomeResponse;
  alcohol: AlcoholResponse;
}

// 4개 섹션과 1:1 대응하는 상단 요약 카드. 기본 비교 기준은 전년동기대비(YoY).
export default function KpiGrid({ fx, csi, income, alcohol }: Props) {
  const latestFx = fx.points[fx.points.length - 1];
  const latestCsi = csi.points[csi.points.length - 1];
  const latestIncome = income.points[income.points.length - 1];
  const latestAlcohol = alcohol.summary;

  const fxUsdYoy = yoyPct(fx.points, fx.points.length - 1, 12, "usd");
  const csiYoyIdx = csi.points.length - 13;
  const csiYoy = csiYoyIdx >= 0 ? latestCsi.value - csi.points[csiYoyIdx].value : null;

  const cards = [
    {
      kicker: "환율 (USD·EUR/KRW)",
      value: (
        <>
          {latestFx.usd.toLocaleString("ko-KR")}
          <span className="kpi-unit">원</span>
        </>
      ),
      meta: fxUsdYoy != null ? `${fmtPct(fxUsdYoy)} 전년동월대비 (달러)` : `${latestFx.label} 월평균`,
      metaColor: fxUsdYoy != null ? changeColor(fxUsdYoy) : undefined,
      sub: latestFx.eur != null ? `유로 ${Math.round(latestFx.eur).toLocaleString("ko-KR")}원` : null,
    },
    {
      kicker: "소비지출전망CSI",
      value: <>{latestCsi.value}</>,
      meta: csiYoy != null ? `${csiYoy >= 0 ? "▲" : "▼"} ${Math.abs(csiYoy)}p 전년동월대비` : latestCsi.label,
      metaColor: csiYoy != null ? changeColor(csiYoy) : undefined,
      sub: null,
    },
    {
      kicker: "가처분소득 (실질)",
      value: <>{toMillion(latestIncome.value_krw)}</>,
      meta: `${fmtPct(latestIncome.yoy_pct, 2)} 전년동기대비`,
      metaColor: changeColor(latestIncome.yoy_pct),
      sub: null,
    },
    {
      kicker: "주류 실질소비지출",
      value: (
        <>
          {latestAlcohol.latest_value_krw_month.toLocaleString("ko-KR")}
          <span className="kpi-unit">원/월</span>
        </>
      ),
      meta: `${fmtPct(latestAlcohol.yoy_pct)} 전년동기대비`,
      metaColor: changeColor(latestAlcohol.yoy_pct),
      sub: null,
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((c) => (
        <div className="card" key={c.kicker}>
          <div className="kpi-kicker">{c.kicker}</div>
          <div className="kpi-value">{c.value}</div>
          <div className="kpi-meta" style={{ color: c.metaColor }}>
            {c.meta}
          </div>
          {c.sub && <div className="kpi-sub">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}

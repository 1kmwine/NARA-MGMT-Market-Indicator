import { changeColor, fmtPct } from "@/lib/chart";
import type { AlcoholResponse } from "@/lib/types";
import Change from "./Change";
import SourceLine from "./SourceLine";

export default function AlcoholSection({ data }: { data: AlcoholResponse }) {
  const s = data.summary;
  const points = data.points;

  const width = 640, top = 64, baselineY = 170, left = 40, right = 600;
  const maxAbs = Math.max(...points.map((p) => Math.abs(p.yoy_pct)), 1);
  const pxPerPct = (baselineY - top) / maxAbs;
  const xAt = (i: number) => left + (i / Math.max(points.length - 1, 1)) * (right - left);
  const barW = 34;

  return (
    <section id="alcohol" className="card section">
      <h2>3. 주류 소비지출 (가구당 월평균, 실질)</h2>
      <p className="section-insight">
        💡 주류 단독 실질소비가 {s.consecutive_decline_quarters}분기 연속 감소 중이며, {s.latest_period} 기준
        전년동기대비 <Change value={s.yoy_pct}>{fmtPct(s.yoy_pct)}</Change> 감소했습니다
      </p>
      <SourceLine note={data.source_note} source={data.source} />

      <div className="card summary-card">
        <div className="kpi-kicker">{s.latest_period} 주류 단독 실질 소비지출 (담배 제외)</div>
        <div className="kpi-value">
          {s.latest_value_krw_month.toLocaleString("ko-KR")}
          <span className="kpi-unit"> 원/월</span>
        </div>
        <div className="kpi-meta" style={{ color: changeColor(s.yoy_pct) }}>
          {fmtPct(s.yoy_pct)} 전년동기대비 · {s.consecutive_decline_quarters}분기 연속 감소
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="section-title" style={{ margin: "0 0 var(--space-2)" }}>
          분기별 전년동기대비 증감률 추이
        </div>
        <svg width={width} height={210} viewBox={`0 0 ${width} 210`}>
          <text x={right + 10} y={16} textAnchor="end" fontSize={11} fill="var(--color-text-faint)">
            [단위: 원]
          </text>
          <line x1={left - 10} y1={baselineY} x2={right + 10} y2={baselineY} stroke="var(--color-text-faintest)" strokeWidth={1.5} />
          {points.map((p, i) => {
            const known = p.known !== false;
            const h = Math.max(2, Math.round(Math.abs(p.yoy_pct) * pxPerPct));
            return (
              <g key={p.label}>
                <rect
                  x={xAt(i) - barW / 2}
                  y={baselineY - h}
                  width={barW}
                  height={h}
                  rx={4}
                  fill="var(--accent)"
                  opacity={known ? 1 : 0.35}
                />
                {known && (
                  <>
                    <text x={xAt(i)} y={baselineY - h - 24} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--color-text)">
                      {p.value_krw.toLocaleString("ko-KR")}
                    </text>
                    <text
                      x={xAt(i)}
                      y={baselineY - h - 7}
                      textAnchor="middle"
                      fontSize={9.5}
                      fontWeight={600}
                      fill={changeColor(p.yoy_pct)}
                    >
                      ({p.yoy_pct >= 0 ? "▲" : "▼"}
                      {Math.abs(p.yoy_pct).toFixed(1)}%)
                    </text>
                  </>
                )}
                <text x={xAt(i)} y={baselineY + 20} textAnchor="middle" fontSize={11} fill="var(--color-text-faint)">
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

"use client";

import { changeColor, fmtPct, scaleY } from "@/lib/chart";
import { useContainerWidth } from "@/lib/useContainerWidth";
import type { AlcoholResponse } from "@/lib/types";
import Change from "./Change";
import SourceLine from "./SourceLine";

// 📝 아래 문구는 자유롭게 수정하세요 — 차트 하단에 그대로 표시됩니다.
const NOTE =
  "막대 높이는 분기별 주류 단독 실질 소비지출 금액(원) 그대로이며, 괄호 안 %는 " +
  "그 금액의 전년동기대비 증감률입니다.";

export default function AlcoholSection({ data }: { data: AlcoholResponse }) {
  const s = data.summary;
  const points = data.points;
  const { ref, width } = useContainerWidth(900);

  const height = 210;
  const top = 64, baselineY = 170, left = 50, right = width - 30;
  const xAt = (i: number) => left + (i / Math.max(points.length - 1, 1)) * (right - left);
  const barW = Math.min(40, Math.max(20, (right - left) / points.length - 12));

  const knownVals = points.filter((p) => p.known !== false).map((p) => p.value_krw);
  const min = Math.min(...knownVals);
  const max = Math.max(...knownVals);
  const pad = Math.max((max - min) * 0.15, 1);
  const scaleMin = min - pad, scaleMax = max + pad;

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

      <div style={{ marginTop: "var(--space-5)" }}>
        <div className="section-title" style={{ margin: "0 0 var(--space-2)" }}>
          분기별 실질 소비지출 금액 추이
        </div>
        <div ref={ref}>
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", fontFamily: "var(--font-sans)" }}>
            <text x={right + 10} y={16} textAnchor="end" fontSize={11} fill="var(--color-text-faint)">
              [단위: 원]
            </text>
            <line x1={left - 10} y1={baselineY} x2={right + 10} y2={baselineY} stroke="var(--color-text-faintest)" strokeWidth={1.5} />
            {points.map((p, i) => {
              const known = p.known !== false;
              const barTop = known ? scaleY(p.value_krw, scaleMin, scaleMax, top, baselineY) : baselineY - 2;
              const h = known ? baselineY - barTop : 2;
              return (
                <g key={p.label}>
                  <rect
                    x={xAt(i) - barW / 2}
                    y={baselineY - h}
                    width={barW}
                    height={h}
                    rx={4}
                    fill="var(--chart-1)"
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
                        fontSize={10}
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
      </div>
      <p className="field-src" style={{ marginTop: "var(--space-2)" }}>{NOTE}</p>
    </section>
  );
}

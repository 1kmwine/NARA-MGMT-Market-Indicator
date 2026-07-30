import { changeColor, fmtPct, scaleY, toMillion } from "@/lib/chart";
import type { IncomeResponse } from "@/lib/types";
import Change from "./Change";
import SourceLine from "./SourceLine";

export default function IncomeSection({ data }: { data: IncomeResponse }) {
  const pts = data.points;
  const latest = pts[pts.length - 1];

  // 막대 높이 = 소득 금액(백만원). YoY %는 금액 라벨 바로 아래 괄호로만 표기.
  // 분기 수가 많을 때 라벨이 옆 막대와 겹치지 않도록 폭을 넉넉히 잡는다.
  const width = 760, top = 64, bottom = 170, left = 60, right = 720;
  const vals = pts.map((p) => p.value_krw / 1000000);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.15, 0.1);
  const scaleMin = min - pad, scaleMax = max + pad;
  const xAt = (i: number) => left + (i / Math.max(pts.length - 1, 1)) * (right - left);
  const barW = 30;

  return (
    <section id="income" className="card section">
      <h2>3. 가구당 월평균 처분가능소득 (실질, 전년동기대비 증감률)</h2>
      <p className="section-insight">
        💡 가처분소득(실질)이 {latest.label} 기준 전년동기대비{" "}
        <Change value={latest.yoy_pct}>{fmtPct(latest.yoy_pct, 2)}</Change> {latest.yoy_pct >= 0 ? "증가" : "감소"}
        했습니다 (가구당 월평균 {toMillion(latest.value_krw)})
      </p>
      <SourceLine note={data.source_note} source={data.source} />
      <svg width={width} height={210} viewBox={`0 0 ${width} 210`} style={{ marginTop: 16 }}>
        <text x={right + 20} y={12} textAnchor="end" fontSize={11} fill="var(--color-text-faint)">
          [단위: 백만원]
        </text>
        <text x={right + 20} y={29} textAnchor="end" fontSize={10} fill="var(--color-text-faintest)">
          (괄호 안은 전년동기대비 증감률)
        </text>
        <line x1={left - 20} y1={bottom} x2={right + 20} y2={bottom} stroke="var(--color-text-faintest)" strokeWidth={1.5} />
        {pts.map((p, i) => {
          const valMillion = p.value_krw / 1000000;
          const barTop = scaleY(valMillion, scaleMin, scaleMax, top, bottom);
          const barH = bottom - barTop;
          return (
            <g key={p.label}>
              <rect x={xAt(i) - barW / 2} y={barTop} width={barW} height={barH} rx={4} fill="var(--accent)" />
              <text x={xAt(i)} y={barTop - 22} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--color-text)">
                {valMillion.toFixed(1)}
              </text>
              <text x={xAt(i)} y={barTop - 6} textAnchor="middle" fontSize={9.5} fontWeight={600} fill={changeColor(p.yoy_pct)}>
                ({p.yoy_pct >= 0 ? "▲" : "▼"}
                {Math.abs(p.yoy_pct).toFixed(1)}%)
              </text>
              <text x={xAt(i)} y={bottom + 26} textAnchor="middle" fontSize={11} fill="var(--color-text-faint)">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

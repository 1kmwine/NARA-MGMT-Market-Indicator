"use client";

import { useState } from "react";
import { buildPath, changeColor, fmtPct, scaleY, toMillion } from "@/lib/chart";
import { useContainerWidth } from "@/lib/useContainerWidth";
import type { IncomeResponse } from "@/lib/types";
import Change from "./Change";
import SourceLine from "./SourceLine";

// 📝 아래 문구는 자유롭게 수정하세요 — 차트 하단에 그대로 표시됩니다.
const NOTE =
  "증감율 그래프의 0% 선은 전년 동기와 동일한 수준(변화 없음)을 의미합니다. " +
  "절대금액 그래프의 막대 높이는 가구당 월평균 처분가능소득(실질) 금액 그대로입니다.";

type ViewMode = "yoy" | "amount";

export default function IncomeSection({ data }: { data: IncomeResponse }) {
  const pts = data.points;
  const latest = pts[pts.length - 1];
  const { ref, width } = useContainerWidth(900);
  const [view, setView] = useState<ViewMode>("yoy");

  const height = 210;
  const top = 64, bottom = 170, left = 60, right = width - 40;
  const xAt = (i: number) => left + (i / Math.max(pts.length - 1, 1)) * (right - left);
  const barW = Math.min(36, Math.max(18, (right - left) / pts.length - 12));

  return (
    <section id="income" className="card section">
      <h2>2. 가구당 월평균 처분가능소득 (실질, 전년동기대비 증감률)</h2>
      <p className="section-insight">
        💡 가처분소득(실질)이 {latest.label} 기준 전년동기대비{" "}
        <Change value={latest.yoy_pct}>{fmtPct(latest.yoy_pct, 2)}</Change> {latest.yoy_pct >= 0 ? "증가" : "감소"}
        했습니다 (가구당 월평균 {toMillion(latest.value_krw)})
      </p>
      <SourceLine note={data.source_note} source={data.source} />

      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
        <button
          type="button"
          className={view === "yoy" ? "btn" : "btn-outline"}
          onClick={() => setView("yoy")}
        >
          증감율 그래프
        </button>
        <button
          type="button"
          className={view === "amount" ? "btn" : "btn-outline"}
          onClick={() => setView("amount")}
        >
          절대금액 그래프
        </button>
      </div>

      <div ref={ref} style={{ marginTop: "var(--space-4)" }}>
        {view === "yoy" ? (
          <IncomeYoyChart pts={pts} width={width} height={height} top={top} bottom={bottom} xAt={xAt} />
        ) : (
          <IncomeAmountChart pts={pts} width={width} height={height} top={top} bottom={bottom} left={left} right={right} xAt={xAt} barW={barW} />
        )}
      </div>
      <p className="field-src" style={{ marginTop: "var(--space-2)" }}>{NOTE}</p>
    </section>
  );
}

function IncomeYoyChart({
  pts,
  width,
  height,
  top,
  bottom,
  xAt,
}: {
  pts: IncomeResponse["points"];
  width: number;
  height: number;
  top: number;
  bottom: number;
  xAt: (i: number) => number;
}) {
  const vals = pts.map((p) => p.yoy_pct);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 0);
  const pad = Math.max((max - min) * 0.2, 1);
  const scaleMin = min - pad, scaleMax = max + pad;
  const zeroY = scaleY(0, scaleMin, scaleMax, top, bottom);
  const linePts = pts.map((p, i) => ({ x: xAt(i), y: scaleY(p.yoy_pct, scaleMin, scaleMax, top, bottom) }));

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", fontFamily: "var(--font-sans)" }}>
      <text x={width - 20} y={12} textAnchor="end" fontSize={11} fill="var(--color-text-faint)">
        [단위: %]
      </text>
      <line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke="var(--color-text-faintest)" strokeWidth={1.5} strokeDasharray="3,4" />
      <path d={buildPath(linePts)} fill="none" stroke="var(--chart-1)" strokeWidth={2} />
      {pts.map((p, i) => (
        <g key={p.label}>
          <circle cx={xAt(i)} cy={linePts[i].y} r={4} fill="var(--color-surface)" stroke={changeColor(p.yoy_pct)} strokeWidth={2} />
          <text
            x={xAt(i)}
            y={linePts[i].y + (p.yoy_pct >= 0 ? -10 : 18)}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill={changeColor(p.yoy_pct)}
          >
            {fmtPct(p.yoy_pct, 1)}
          </text>
          <text x={xAt(i)} y={bottom + 26} textAnchor="middle" fontSize={11} fill="var(--color-text-faint)">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function IncomeAmountChart({
  pts,
  width,
  height,
  top,
  bottom,
  left,
  right,
  xAt,
  barW,
}: {
  pts: IncomeResponse["points"];
  width: number;
  height: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  xAt: (i: number) => number;
  barW: number;
}) {
  const vals = pts.map((p) => p.value_krw / 1000000);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.15, 0.1);
  const scaleMin = min - pad, scaleMax = max + pad;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", fontFamily: "var(--font-sans)" }}>
      <text x={right + 20} y={12} textAnchor="end" fontSize={11} fill="var(--color-text-faint)">
        [단위: 백만원]
      </text>
      <line x1={left - 20} y1={bottom} x2={right + 20} y2={bottom} stroke="var(--color-text-faintest)" strokeWidth={1.5} />
      {pts.map((p, i) => {
        const valMillion = p.value_krw / 1000000;
        const barTop = scaleY(valMillion, scaleMin, scaleMax, top, bottom);
        const barH = bottom - barTop;
        return (
          <g key={p.label}>
            <rect x={xAt(i) - barW / 2} y={barTop} width={barW} height={barH} rx={4} fill="var(--chart-1)" />
            <text x={xAt(i)} y={barTop - 12} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--color-text)">
              {valMillion.toFixed(1)}
            </text>
            <text x={xAt(i)} y={bottom + 26} textAnchor="middle" fontSize={11} fill="var(--color-text-faint)">
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

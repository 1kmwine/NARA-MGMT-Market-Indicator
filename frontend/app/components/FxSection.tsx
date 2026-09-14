"use client";

import { useState } from "react";
import { buildPath, fmtPct, pickLabelIndices, scaleY, yoyPct } from "@/lib/chart";
import type { FxBasis, FxLatest, FxResponse } from "@/lib/types";
import Change from "./Change";
import EditableInsight from "./EditableInsight";
import SourceLine from "./SourceLine";

// 두 계열 모두 실선이라 색만으로 구분된다. NARA-Design-System 팔레트의 블루 계열
// 두 톤(달러=accent 블루, 유로=차트 강조 네이비)으로 구분하고, 표식은 흰 속에
// 계열색 테두리를 둘러 선과 겹쳐도 개수가 보이게 한다.
const USD_COLOR = "var(--accent)";
const EUR_COLOR = "var(--color-chart-emphasis)";
const MARKER_FILL = "#FFFFFF";

const WIDTH = 720, HEIGHT = 240;
// 오른쪽 여백을 넉넉히 둬서(RIGHT=640) 마지막 값 라벨이 잘리지 않게 한다.
const TOP = 30, BOTTOM = 200, LEFT = 44, RIGHT = 640;

/** 환율 표기는 소수 1자리로 통일. 차트 위 라벨만 자리폭 때문에 정수로 둔다. */
const fmtWon = (v: number) =>
  v.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function FxInsight({ pts, basis }: { pts: FxResponse["points"]; basis: FxBasis }) {
  const n = pts.length;
  const latest = pts[n - 1];
  const yoy = yoyPct(pts, n - 1, 12, "usd");
  const mom = yoyPct(pts, n - 1, 1, "usd");
  const basisLabel = basis === "eom" ? "월말" : "월평균";

  return (
    <>
      원/달러 환율({basisLabel})이 {latest.label} {latest.usd.toLocaleString("ko-KR")}원으로 전년동월대비{" "}
      {yoy != null ? <Change value={yoy}>{fmtPct(yoy)}</Change> : "데이터 부족"}
      {mom != null && Math.abs(mom) >= 2 && (
        <>
          {" "}(전월대비 <Change value={mom}>{fmtPct(mom)}</Change>로 변동폭 확대)
        </>
      )}
    </>
  );
}

export default function FxSection({
  initialData,
  latest,
  insightOverride,
}: {
  initialData: FxResponse;
  latest: FxLatest;
  insightOverride: string;
}) {
  const [data, setData] = useState(initialData);
  const [basis, setBasis] = useState<FxBasis>(initialData.basis);
  const [loading, setLoading] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  async function changeBasis(next: FxBasis) {
    if (next === basis || loading) return;
    setLoading(true);
    try {
      // 브라우저는 내부 도커 네트워크의 backend:8000을 직접 호출할 수 없어서,
      // 같은 오리진의 프록시 라우트(app/api/fx/route.ts)를 거쳐야 한다.
      const res = await fetch(`/api/fx?basis=${next}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`요청 실패: ${res.status}`);
      const json: FxResponse = await res.json();
      setData(json);
      setBasis(next);
    } catch {
      // 실패하면 조용히 이전 값 유지 — 조회 자체는 이미 성공했던 값이 화면에 남아있는 게 낫다.
    } finally {
      setLoading(false);
    }
  }

  const pts = data.points;
  const n = pts.length;
  const basisLabel = basis === "eom" ? "월말" : "월평균";

  const vals = pts.flatMap((p) => [p.usd, p.eur]).filter((v): v is number => v != null);
  const min = Math.min(...vals) - 30;
  const max = Math.max(...vals) + 30;
  const xAt = (i: number) => LEFT + (i / (n - 1)) * (RIGHT - LEFT);
  const labelIdxs = pickLabelIndices(n, 7);
  const lastIdx = n - 1;

  const usdPts = pts.map((p, i) => ({ x: xAt(i), y: scaleY(p.usd, min, max, TOP, BOTTOM) }));
  const eurPtsWithIdx = pts
    .map((p, i) => ({ p, i }))
    .filter((e): e is { p: typeof e.p & { eur: number }; i: number } => e.p.eur != null)
    .map(({ p, i }) => ({ x: xAt(i), y: scaleY(p.eur, min, max, TOP, BOTTOM), i, eur: p.eur }));
  const eurByIdx = new Map(eurPtsWithIdx.map((e) => [e.i, e]));

  // 히트영역은 점이 아니라 세로 기둥 — 두 계열 중 어느 쪽에 가까이 가도 그 달이 잡힌다.
  const colW = (RIGHT - LEFT) / (n - 1);
  const hover = hoverIdx != null ? pts[hoverIdx] : null;
  const hoverY =
    hoverIdx != null ? Math.min(usdPts[hoverIdx].y, eurByIdx.get(hoverIdx)?.y ?? usdPts[hoverIdx].y) : 0;

  return (
    <section id="fx" className="card section">
      <h2>달러 · 유로 환율</h2>
      <EditableInsight section="fx" override={insightOverride} fallback={<FxInsight pts={pts} basis={basis} />} />
      <SourceLine note={data.source_note} source={data.source} />

      <div className="seg-group" role="group" aria-label="환율 기준 선택">
        <button
          type="button"
          className={basis === "avg" ? "seg-btn on" : "seg-btn"}
          onClick={() => changeBasis("avg")}
          disabled={loading}
          aria-pressed={basis === "avg"}
        >
          월평균
        </button>
        <button
          type="button"
          className={basis === "eom" ? "seg-btn on" : "seg-btn"}
          onClick={() => changeBasis("eom")}
          disabled={loading}
          aria-pressed={basis === "eom"}
        >
          월말 기준
        </button>
      </div>

      <div style={{ position: "relative", marginTop: "var(--space-4)" }}>
        <svg
          width={WIDTH}
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          style={{ display: "block", opacity: loading ? 0.5 : 1 }}
        >
          {[0, 1, 2, 3].map((i) => {
            const y = TOP + (i * (BOTTOM - TOP)) / 3;
            return <line key={i} x1={0} y1={y} x2={WIDTH} y2={y} stroke="var(--color-divider)" strokeWidth={1} />;
          })}
          {hoverIdx != null && (
            <line
              x1={xAt(hoverIdx)}
              y1={TOP - 10}
              x2={xAt(hoverIdx)}
              y2={BOTTOM}
              stroke="var(--color-text-faintest)"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          )}
          <path d={buildPath(usdPts)} fill="none" stroke={USD_COLOR} strokeWidth={3} />
          {eurPtsWithIdx.length > 0 && (
            <path d={buildPath(eurPtsWithIdx)} fill="none" stroke={EUR_COLOR} strokeWidth={3} />
          )}
          {pts.map((p, i) => {
            const isLabeled = labelIdxs.has(i);
            const isLast = i === lastIdx;
            const eurPt = eurByIdx.get(i);
            const isHover = hoverIdx === i;
            return (
              <g key={p.label}>
                <circle
                  cx={xAt(i)}
                  cy={usdPts[i].y}
                  r={isHover ? 5 : isLabeled ? 4 : 3}
                  fill={MARKER_FILL}
                  stroke={p.est ? "var(--color-text-disabled)" : USD_COLOR}
                  strokeWidth={2}
                />
                {eurPt && (
                  <circle
                    cx={xAt(i)}
                    cy={eurPt.y}
                    r={isHover ? 5 : isLabeled ? 4 : 3}
                    fill={MARKER_FILL}
                    stroke={EUR_COLOR}
                    strokeWidth={2}
                  />
                )}
                {isLabeled && (
                  <>
                    <text x={xAt(i)} y={228} textAnchor="middle" fontSize={11} fill="var(--color-text-faint)">
                      {p.label}
                    </text>
                    <text
                      x={xAt(i)}
                      y={usdPts[i].y + 16}
                      textAnchor="middle"
                      fontSize={isLast ? 13 : 10.5}
                      fontWeight={isLast ? 800 : 700}
                      fill="var(--color-text)"
                      stroke="#FFFFFF"
                      strokeWidth={3.5}
                      paintOrder="stroke"
                    >
                      {Math.round(p.usd).toLocaleString("ko-KR")}
                    </text>
                    {eurPt && (
                      <text
                        x={xAt(i)}
                        y={eurPt.y - 10}
                        textAnchor="middle"
                        fontSize={isLast ? 13 : 10.5}
                        fontWeight={isLast ? 800 : 700}
                        fill="var(--color-text)"
                        stroke="#FFFFFF"
                        strokeWidth={3.5}
                        paintOrder="stroke"
                      >
                        {Math.round(eurPt.eur).toLocaleString("ko-KR")}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
          {/* 히트영역은 선·라벨 위에 얹혀야 하므로 마지막에 그린다 */}
          {pts.map((p, i) => (
            <rect
              key={`hit-${p.label}`}
              x={xAt(i) - colW / 2}
              y={0}
              width={colW}
              height={HEIGHT}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
            />
          ))}
        </svg>
        {hover && hoverIdx != null && (
          <div
            style={{
              position: "absolute",
              left: xAt(hoverIdx),
              top: hoverY,
              transform: "translate(-50%, -130%)",
              pointerEvents: "none",
              background: "var(--color-text)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 9px",
              borderRadius: "var(--radius-sm)",
              whiteSpace: "nowrap",
              boxShadow: "var(--shadow-popover)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {hover.label} {basisLabel} · 달러 {fmtWon(hover.usd)}원
            {hover.eur != null ? ` · 유로 ${fmtWon(hover.eur)}원` : ""}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-2)" }}>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: USD_COLOR }} />
          USD/KRW {basisLabel} (원)
        </div>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: EUR_COLOR }} />
          EUR/KRW {basisLabel} (원)
        </div>
      </div>

      <div className="fx-latest-grid">
        <LatestBox date={latest.date} name="달러 (USD/KRW)" color={USD_COLOR} value={latest.usd} prev={latest.usd_prev} />
        {latest.eur != null && (
          <LatestBox date={latest.date} name="유로 (EUR/KRW)" color={EUR_COLOR} value={latest.eur} prev={latest.eur_prev} />
        )}
      </div>
      <div style={{ marginTop: "var(--space-2)" }}>
        <SourceLine note={latest.source_note} source={latest.source} />
      </div>
    </section>
  );
}

/** 조회 시점(가장 최근 영업일) 환율 한 통화를 상자 하나로 보여준다.
    상단 조회 날짜 → 통화명 → 값 → 전일대비 증감 순. */
function LatestBox({
  date,
  name,
  color,
  value,
  prev,
}: {
  date: string;
  name: string;
  color: string;
  value: number;
  prev: number | null;
}) {
  const diff = prev != null ? value - prev : null;
  const diffPct = prev ? (diff! / prev) * 100 : null;

  return (
    <div className="fx-latest-box">
      <div className="fx-latest-date">{date} 기준 (가장 최근 영업일)</div>
      <div className="fx-latest-name">
        <span className="legend-dot" style={{ background: color }} />
        {name}
      </div>
      <div className="fx-latest-value">
        {fmtWon(value)}
        <span className="kpi-unit">원</span>
      </div>
      <div className="fx-latest-change">
        {diff != null && diffPct != null ? (
          // fmtPct는 자체적으로 ▲/▼를 붙이므로, 원 단위 증감에는 화살표를 따로 달지 않는다.
          <Change value={diff}>
            전일대비 {fmtPct(diffPct, 1)} ({diff >= 0 ? "+" : "-"}
            {Math.abs(diff).toFixed(1)}원)
          </Change>
        ) : (
          <span style={{ color: "var(--color-text-faint)" }}>전일 대비 비교값 없음</span>
        )}
      </div>
    </div>
  );
}

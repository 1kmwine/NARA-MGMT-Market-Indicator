import { buildPath, fmtPct, pickLabelIndices, scaleY, yoyPct } from "@/lib/chart";
import type { FxResponse } from "@/lib/types";
import Change from "./Change";
import SourceLine from "./SourceLine";

export default function FxSection({ data }: { data: FxResponse }) {
  const pts = data.points;
  const n = pts.length;
  const latest = pts[n - 1];
  const yoy = yoyPct(pts, n - 1, 12, "usd");
  const mom = yoyPct(pts, n - 1, 1, "usd");

  const vals = pts.flatMap((p) => [p.usd, p.eur]).filter((v): v is number => v != null);
  const min = Math.min(...vals) - 30;
  const max = Math.max(...vals) + 30;
  // 오른쪽 여백을 넉넉히 둬서(right=640, 캔버스 폭 720) 마지막 값 라벨이 잘리지 않게 한다.
  const top = 30, bottom = 200, left = 44, right = 640;
  const xAt = (i: number) => left + (i / (pts.length - 1)) * (right - left);
  const labelIdxs = pickLabelIndices(pts.length, 7);
  const lastIdx = pts.length - 1;

  const usdPts = pts.map((p, i) => ({ x: xAt(i), y: scaleY(p.usd, min, max, top, bottom) }));
  const eurPtsWithIdx = pts
    .map((p, i) => ({ p, i }))
    .filter((e): e is { p: typeof e.p & { eur: number }; i: number } => e.p.eur != null)
    .map(({ p, i }) => ({ x: xAt(i), y: scaleY(p.eur, min, max, top, bottom), i, eur: p.eur }));
  const eurByIdx = new Map(eurPtsWithIdx.map((e) => [e.i, e]));

  return (
    <section id="fx" className="card section">
      <h2>1. 달러 · 유로 환율</h2>
      <p className="section-insight">
        💡 원/달러 환율이 {latest.label} {latest.usd.toLocaleString("ko-KR")}원으로 전년동월대비{" "}
        {yoy != null ? <Change value={yoy}>{fmtPct(yoy)}</Change> : "데이터 부족"}
        {mom != null && Math.abs(mom) >= 2 && (
          <>
            {" "}(전월대비 <Change value={mom}>{fmtPct(mom)}</Change>로 변동폭 확대)
          </>
        )}
      </p>
      <SourceLine note={data.source_note} source={data.source} />
      <svg width={720} height={240} viewBox="0 0 720 240" style={{ marginTop: 16 }}>
        {[0, 1, 2, 3].map((i) => {
          const y = top + (i * (bottom - top)) / 3;
          return <line key={i} x1={0} y1={y} x2={720} y2={y} stroke="var(--color-divider)" strokeWidth={1} />;
        })}
        <path d={buildPath(usdPts)} fill="none" stroke="var(--accent)" strokeWidth={3} />
        {eurPtsWithIdx.length > 0 && (
          <path d={buildPath(eurPtsWithIdx)} fill="none" stroke="var(--color-text-secondary)" strokeWidth={3} strokeDasharray="5,5" />
        )}
        {pts.map((p, i) => {
          const isLabeled = labelIdxs.has(i);
          const isLast = i === lastIdx;
          const eurPt = eurByIdx.get(i);
          return (
            <g key={p.label}>
              <circle
                cx={xAt(i)}
                cy={usdPts[i].y}
                r={p.est ? 2.5 : isLabeled ? 4 : 2.5}
                fill={p.est ? "var(--color-text-disabled)" : "var(--accent)"}
              />
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
                    fill="var(--accent)"
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
                      fill="var(--color-text-secondary)"
                    >
                      {Math.round(eurPt.eur).toLocaleString("ko-KR")}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: "var(--accent)" }} />
          USD/KRW 월평균 (원)
        </div>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: "var(--color-text-secondary)" }} />
          EUR/KRW 월평균 (원)
        </div>
      </div>
    </section>
  );
}

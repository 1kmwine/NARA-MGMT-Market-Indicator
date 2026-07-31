import { buildPath, pickLabelIndices, scaleY } from "@/lib/chart";
import type { CsiResponse } from "@/lib/types";
import Change from "./Change";
import SourceLine from "./SourceLine";

// YoY 변화가 유의미할 때(1p 이상)만 YoY로 설명하고, 거의 변동이 없으면(보합)
// "0p 상승"처럼 의미 없는 문장 대신 최근 3개월 추세로 설명을 대체한다.
function CsiInsight({ pts }: { pts: CsiResponse["points"] }) {
  const n = pts.length;
  const latest = pts[n - 1];
  const yoy = n - 13 >= 0 ? latest.value - pts[n - 13].value : null;
  const mom = n - 2 >= 0 ? latest.value - pts[n - 2].value : null;

  if (yoy != null && Math.abs(yoy) >= 1) {
    return (
      <>
        💡 소비지출전망CSI가 {latest.label} {latest.value}pt로 전년동월대비{" "}
        <Change value={yoy}>
          {yoy >= 0 ? "▲" : "▼"} {Math.abs(yoy)}p
        </Change>{" "}
        {yoy >= 0 ? "상승" : "하락"}했습니다
        {mom != null && Math.abs(mom) >= 3 && (
          <>
            {" "}
            (전월대비도{" "}
            <Change value={mom}>
              {mom >= 0 ? "▲" : "▼"} {Math.abs(mom)}p
            </Change>
            로 변동폭 확대)
          </>
        )}
      </>
    );
  }

  const recentIdx = Math.max(0, n - 4);
  const recentDiff = latest.value - pts[recentIdx].value;
  if (recentIdx !== n - 1 && Math.abs(recentDiff) >= 1) {
    return (
      <>
        💡 소비지출전망CSI가 {latest.label} {latest.value}pt로 전년동월과 비슷한 수준이나, 최근 3개월간{" "}
        <Change value={recentDiff}>
          {recentDiff >= 0 ? "▲" : "▼"} {Math.abs(recentDiff)}p
        </Change>{" "}
        {recentDiff >= 0 ? "상승" : "하락"}하는 흐름입니다
      </>
    );
  }

  return (
    <>
      💡 소비지출전망CSI가 {latest.label} {latest.value}pt로 뚜렷한 변동 없이 보합권을 유지하고 있습니다
    </>
  );
}

export default function CsiSection({ data }: { data: CsiResponse }) {
  const pts = data.points;
  const vals = pts.map((p) => p.value);
  const min = Math.min(...vals, 95) - 5;
  const max = Math.max(...vals, 100) + 5;
  const top = 20, bottom = 170, left = 50, right = 590;
  const xAt = (i: number) => left + (i / (pts.length - 1)) * (right - left);
  const labelIdxs = pickLabelIndices(pts.length, 8);
  const baselineY = scaleY(100, min, max, top, bottom);
  const linePts = pts.map((p, i) => ({ x: xAt(i), y: scaleY(p.value, min, max, top, bottom) }));

  return (
    <section id="csi" className="card section">
      <h2>1. 소비지출전망CSI</h2>
      <p className="section-insight">
        <CsiInsight pts={pts} />
      </p>
      <SourceLine note={data.source_note} source={data.source} />
      <svg width={640} height={210} viewBox="0 0 640 210" style={{ marginTop: "var(--space-4)" }}>
        {[0, 1, 2].map((i) => {
          const y = top + (i * (bottom - top)) / 2;
          return <line key={i} x1={0} y1={y} x2={640} y2={y} stroke="var(--color-divider)" strokeWidth={1} />;
        })}
        <line x1={0} y1={baselineY} x2={640} y2={baselineY} stroke="var(--color-text-faintest)" strokeWidth={1} strokeDasharray="3,4" />
        <path d={buildPath(linePts)} fill="none" stroke="var(--chart-1)" strokeWidth={2} />
        {pts.map((p, i) => {
          const isLabeled = labelIdxs.has(i);
          return (
            <g key={p.label}>
              <circle
                cx={xAt(i)}
                cy={linePts[i].y}
                r={isLabeled ? 4 : 2}
                fill="var(--color-surface)"
                stroke="var(--chart-1)"
                strokeWidth={2}
              />
              {isLabeled && (
                <>
                  <text x={xAt(i)} y={linePts[i].y - 10} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="var(--color-text)">
                    {p.value}
                  </text>
                  <text x={xAt(i)} y={bottom + 30} textAnchor="middle" fontSize={10.5} fill="var(--color-text-muted)">
                    {p.label}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </section>
  );
}

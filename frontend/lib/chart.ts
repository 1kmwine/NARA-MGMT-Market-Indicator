// SVG 차트 좌표 계산 + 증감 표기 공통 유틸.
// (기존 바닐라 JS 버전 frontend/app.js의 로직을 그대로 포팅, 색상만 NID 공통 토큰으로 교체)

export function scaleY(val: number, min: number, max: number, top: number, bottom: number): number {
  return bottom - ((val - min) / (max - min)) * (bottom - top);
}

export function buildPath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => (i === 0 ? "M" : "L") + p.x + " " + p.y).join(" ");
}

// 라벨이 너무 촘촘해지지 않도록, 전체 포인트 수에 맞춰 표시할 인덱스만 골라준다.
// 마지막 라벨은 항상 포함하되, 바로 앞 라벨과 너무 가까우면(겹칠 정도면) 앞 라벨을 뺀다.
export function pickLabelIndices(n: number, maxLabels: number): Set<number> {
  if (n <= maxLabels) return new Set(Array.from({ length: n }, (_, i) => i));
  const step = Math.ceil(n / (maxLabels - 1));
  const idxs: number[] = [];
  for (let i = 0; i < n; i += step) idxs.push(i);
  const last = n - 1;
  if (idxs[idxs.length - 1] !== last) {
    if (last - idxs[idxs.length - 1] < step * 0.6) idxs.pop();
    idxs.push(last);
  }
  return new Set(idxs);
}

export function fmtPct(pct: number, digits = 1): string {
  return (pct >= 0 ? "▲ " : "▼ ") + Math.abs(pct).toFixed(digits) + "%";
}

export function toMillion(krw: number): string {
  return (krw / 1000000).toFixed(1) + "백만원";
}

// NID 공통 토큰: 상승(증가) = 초록(--color-up), 하락(감소) = 빨강(--color-danger)
export function changeColor(value: number): string {
  return value < 0 ? "var(--color-danger)" : "var(--color-up)";
}

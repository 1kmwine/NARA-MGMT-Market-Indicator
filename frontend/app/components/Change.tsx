import { changeColor } from "@/lib/chart";

// 상승(증가)=초록/하락(감소)=빨강 — NID 공통 semantic 색으로 증감을 표시하는 인라인 텍스트.
export default function Change({ value, children }: { value: number; children: React.ReactNode }) {
  return <span style={{ color: changeColor(value) }}>{children}</span>;
}

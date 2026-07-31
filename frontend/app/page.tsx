import { getAlcohol, getCsi, getIncome } from "@/lib/api";
import AlcoholSection from "./components/AlcoholSection";
import CsiSection from "./components/CsiSection";
import IncomeSection from "./components/IncomeSection";
import KpiGrid from "./components/KpiGrid";

export const dynamic = "force-dynamic"; // 캐시 없이, 조회할 때마다 백엔드가 ECOS/KOSIS에서 받아온 최신 값을 그대로 받아온다.

export default async function Page() {
  const dataAsOf = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  let csi, income, alcohol;
  try {
    [csi, income, alcohol] = await Promise.all([getCsi(), getIncome(), getAlcohol()]);
  } catch (err) {
    return (
      <div className="wrap">
        <div className="card">
          <div className="kpi-kicker">오류</div>
          <p style={{ marginTop: "var(--space-2)" }}>
            데이터를 불러오지 못했습니다: {err instanceof Error ? err.message : String(err)}
            <br />
            백엔드(FastAPI)가 실행 중인지 확인하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="masthead">
        <div>
          <span className="chip-accent">나라셀라 · 경영진 보고</span>
          <h1 style={{ marginTop: "var(--space-2)" }}>선행지표 대시보드</h1>
          <p style={{ maxWidth: 560, color: "var(--color-text-muted)" }}>
            소비심리·가계소득·주류소비 3개 선행지표를 통해 업황 변화를 조기에 포착합니다.
          </p>
        </div>
        <div className="card" style={{ minWidth: 220 }}>
          <div className="kpi-kicker">데이터 기준</div>
          <div style={{ marginTop: "var(--space-1)" }}>{dataAsOf} 조회</div>
        </div>
      </div>

      <div className="nav-row">
        <a href="#csi" className="btn-outline">소비지출전망CSI</a>
        <a href="#income" className="btn-outline">가처분소득</a>
        <a href="#alcohol" className="btn-outline">주류 소비지출</a>
      </div>

      <KpiGrid csi={csi} income={income} alcohol={alcohol} />

      <CsiSection data={csi} />
      <IncomeSection data={income} />
      <AlcoholSection data={alcohol} />

      <div className="footer-note">
        <strong style={{ color: "var(--color-text)" }}>데이터 갱신 안내</strong> — 이 화면은 백엔드(FastAPI, <code>/api/*</code>)에서
        데이터를 받아옵니다. 각 카드의 <span className="source-badge live">실시간</span> 배지는 ECOS/KOSIS API 연동 결과,{" "}
        <span className="source-badge fallback">스냅샷</span> 배지는 통계코드 설정 전 임시 값임을 의미합니다.
      </div>
    </div>
  );
}

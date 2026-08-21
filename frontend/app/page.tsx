import { getAlcohol, getCsi, getIncome, getInsights } from "@/lib/api";
import AlcoholSection from "./components/AlcoholSection";
import CsiSection from "./components/CsiSection";
import IncomeSection from "./components/IncomeSection";
import KpiGrid from "./components/KpiGrid";

export const dynamic = "force-dynamic"; // 캐시 없이, 매번 백엔드(→DB)에서 가장 최근 적재분을 읽는다.

/** DB 적재 시각을 "2026년 8월 21일 08:00 적재"로 표기. 적재 전이면 조회 시각으로 대체. */
function formatDataAsOf(collectedAt: string | null): string {
  if (!collectedAt) {
    return `${new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} 조회`;
  }
  const at = new Date(collectedAt);
  const day = at.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const time = at.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} ${time} 적재`;
}

export default async function Page() {
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

  // 인사이트 편집 문구는 부가 기능이라, 조회에 실패해도 대시보드 자체는 그대로 뜨게 한다.
  const insights = await getInsights().catch(() => ({ csi: "", income: "", alcohol: "" }));

  const dataAsOf = formatDataAsOf(csi.collected_at);

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
          <div style={{ marginTop: "var(--space-1)" }}>{dataAsOf}</div>
        </div>
      </div>

      <div className="nav-row">
        <a href="#csi" className="btn-outline">소비지출전망CSI</a>
        <a href="#income" className="btn-outline">가처분소득</a>
        <a href="#alcohol" className="btn-outline">주류 소비지출</a>
      </div>

      <KpiGrid csi={csi} income={income} alcohol={alcohol} />

      <CsiSection data={csi} insightOverride={insights.csi} />
      <IncomeSection data={income} insightOverride={insights.income} />
      <AlcoholSection data={alcohol} insightOverride={insights.alcohol} />

      <div className="footer-note">
        <strong style={{ color: "var(--color-text)" }}>데이터 갱신 안내</strong> — 지표는 <strong>매일 오전 8시</strong>에 ECOS/KOSIS에서
        자동 수집해 사내 DB에 적재하며, 이 화면은 그 적재분을 읽어 보여줍니다(조회할 때마다 외부 API를 호출하지 않습니다).
        각 카드의 <span className="source-badge live">실시간</span> 배지는 통계 API에서 받은 실측치,{" "}
        <span className="source-badge fallback">스냅샷</span> 배지는 API 장애로 임시 값이 적재됐음을 의미합니다.
      </div>
    </div>
  );
}

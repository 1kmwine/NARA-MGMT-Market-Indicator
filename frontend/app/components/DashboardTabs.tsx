"use client";

import { useState } from "react";

const TABS = [
  { key: "fx", label: "환율" },
  { key: "csi", label: "소비지출전망CSI" },
  { key: "income", label: "가처분소득" },
  { key: "alcohol", label: "주류 소비지출" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// 서버에서 미리 받아온 4개 섹션을 전부 자식으로 받아두고, 화면에는 선택된 탭만 보여준다.
// (재요청 없이 화면 전환만 하는 순수 토글이라, 각 섹션은 그대로 서버 컴포넌트로 둘 수 있다.)
export default function DashboardTabs({
  fx,
  csi,
  income,
  alcohol,
}: {
  fx: React.ReactNode;
  csi: React.ReactNode;
  income: React.ReactNode;
  alcohol: React.ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("fx");
  const panels: Record<TabKey, React.ReactNode> = { fx, csi, income, alcohol };

  return (
    <>
      <div className="tab-row" role="tablist" aria-label="선행지표 섹션 선택">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className={active === t.key ? "tab-btn on" : "tab-btn"}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {panels[active]}
    </>
  );
}

"""
API 인증키/통계코드가 아직 준비되지 않았을 때 화면이 비지 않도록 쓰는 스냅샷 데이터.
원본 디자인(dashboard_design/선행지표 대시보드.dc.html)에 하드코딩되어 있던 값을 그대로 옮겨온 것으로,
실제 API 연동이 끝나면 이 값은 더 이상 쓰이지 않는다 (services/*.py 참고).
"""

# 소비지출전망CSI — ECOS 발표 시점 기준 확인된 값만 (연속 월별 시계열 아님)
CSI_POINTS = [
    {"label": "'21.01", "value": 102},
    {"label": "'21.11", "value": 115},
    {"label": "'23.10", "value": 113},
    {"label": "'25.12", "value": 110},
    {"label": "'26.01", "value": 111},
    {"label": "'26.04", "value": 108},
]

# 처분가능소득(실질, 전체가구, 가구당 월평균) 전년동기대비 증감률.
# 2026-07-22에 KOSIS DT_1L9U118(가계동향조사, 실질) 원본 표를 직접 열어(itmId=T110, objL1=Y1)
# 2022.4/4~2026.1/4 실측치를 받아 계산한 값. 추정/보간 없음 — 전부 실측.
INCOME_YOY = [
    {"label": "'23 Q4", "yoy_pct": 0.12, "value_krw": 3582011},
    {"label": "'24 Q1", "yoy_pct": -1.58, "value_krw": 3560842},
    {"label": "'24 Q2", "yoy_pct": 0.78, "value_krw": 3477617},
    {"label": "'24 Q3", "yoy_pct": 3.35, "value_krw": 3659335},
    {"label": "'24 Q4", "yoy_pct": 2.43, "value_krw": 3669149},
    {"label": "'25 Q1", "yoy_pct": 2.34, "value_krw": 3644119},
    {"label": "'25 Q2", "yoy_pct": -0.52, "value_krw": 3459680},
    {"label": "'25 Q3", "yoy_pct": 2.60, "value_krw": 3754630},
    {"label": "'25 Q4", "yoy_pct": 0.96, "value_krw": 3704210},
    {"label": "'26 Q1", "yoy_pct": 0.68, "value_krw": 3668799},
]
INCOME_SOURCE_NOTE = "KOSIS 가계동향조사(가구당 월평균 가계수지, 전국 1인 이상 가구, 실질)."

# 주류(담배 제외) 실질소비 전년동기대비 증감률 — 위와 같은 방식으로 확인한 실측치(objL1=J1).
# 10개 분기 전부 실측이라 known을 별도로 둘 필요가 없지만, 프론트 코드 호환을 위해 True로 유지.
ALCOHOL_YOY = [
    {"label": "'23 Q4", "yoy_pct": -4.41, "value_krw": 15794, "known": True},
    {"label": "'24 Q1", "yoy_pct": -1.43, "value_krw": 15299, "known": True},
    {"label": "'24 Q2", "yoy_pct": -3.82, "value_krw": 15259, "known": True},
    {"label": "'24 Q3", "yoy_pct": -5.09, "value_krw": 17605, "known": True},
    {"label": "'24 Q4", "yoy_pct": -2.56, "value_krw": 15389, "known": True},
    {"label": "'25 Q1", "yoy_pct": -4.77, "value_krw": 14570, "known": True},
    {"label": "'25 Q2", "yoy_pct": -4.78, "value_krw": 14530, "known": True},
    {"label": "'25 Q3", "yoy_pct": -8.88, "value_krw": 16042, "known": True},
    {"label": "'25 Q4", "yoy_pct": -2.42, "value_krw": 15017, "known": True},
    {"label": "'26 Q1", "yoy_pct": -9.01, "value_krw": 13257, "known": True},
]
ALCOHOL_SUMMARY = {
    "latest_value_krw_month": 13257,
    "latest_period": "'26 Q1",
    "yoy_pct": -9.01,
    "consecutive_decline_quarters": 10,
    "source_note": (
        "KOSIS 가계동향조사(실질) > 가구당 월평균 가계수지 > 12대 비목 > 02.주류·담배 세부항목 '주류'. "
        "무알코올 주류도 주류 지출에 포함. '소버 큐리어스' 트렌드 및 회식 문화 변화가 배경으로 분석됨."
    ),
}

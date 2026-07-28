"""
API 인증키/통계코드가 아직 준비되지 않았을 때 화면이 비지 않도록 쓰는 스냅샷 데이터.
원본 디자인(dashboard_design/선행지표 대시보드.dc.html)에 하드코딩되어 있던 값을 그대로 옮겨온 것으로,
실제 API 연동이 끝나면 이 값은 더 이상 쓰이지 않는다 (services/*.py 참고).
"""

# 월평균 환율 (원/달러, 원/유로). eur가 None인 구간은 유로 데이터 미확인 구간.
# est=True는 인접월 보간 추정치.
FX_MONTHLY = [
    {"label": "'24.01", "usd": 1324.88, "eur": None, "est": False},
    {"label": "'24.02", "usd": 1332.02, "eur": None, "est": False},
    {"label": "'24.03", "usd": 1331.20, "eur": None, "est": False},
    {"label": "'24.04", "usd": 1368.34, "eur": None, "est": False},
    {"label": "'24.05", "usd": 1363.73, "eur": None, "est": False},
    {"label": "'24.06", "usd": 1379.84, "eur": None, "est": False},
    {"label": "'24.07", "usd": 1381.84, "eur": None, "est": False},
    {"label": "'24.08", "usd": 1349.87, "eur": None, "est": False},
    {"label": "'24.09", "usd": 1329.60, "eur": None, "est": False},
    {"label": "'24.10", "usd": 1360.73, "eur": None, "est": False},
    {"label": "'24.11", "usd": 1391.66, "eur": None, "est": True},
    {"label": "'24.12", "usd": 1422.63, "eur": None, "est": True},
    {"label": "'25.01", "usd": 1453.39, "eur": 1505.16, "est": False},
    {"label": "'25.02", "usd": 1445.09, "eur": 1505.88, "est": False},
    {"label": "'25.03", "usd": 1457.35, "eur": 1577.24, "est": False},
    {"label": "'25.04", "usd": 1439.54, "eur": 1615.44, "est": False},
    {"label": "'25.05", "usd": 1391.19, "eur": 1568.74, "est": False},
    {"label": "'25.06", "usd": 1364.66, "eur": 1573.82, "est": False},
    {"label": "'25.07", "usd": 1378.36, "eur": 1609.19, "est": False},
    {"label": "'25.08", "usd": 1389.05, "eur": 1618.23, "est": False},
    {"label": "'25.09", "usd": 1393.08, "eur": 1635.03, "est": False},
    {"label": "'25.10", "usd": 1423.23, "eur": 1656.69, "est": False},
]

FX_SOURCE_NOTE = (
    "서울외국환중개 매매기준율(월평균 환산). "
    "원/유로는 EUR/USD 동기간 시장평균 반영 환산치. "
    "'24.11~'24.12 원/달러는 인접월 보간 추정치."
)

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

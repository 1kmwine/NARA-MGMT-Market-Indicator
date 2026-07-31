"""
통계표코드 설정. ECOS(CSI), KOSIS(가처분소득·주류) 전부 2026-07-22에 실제 확인 완료.
코드가 잘못되거나 API 호출이 실패하면 fallback_data.py의 스냅샷 값으로 화면이 채워진다.
"""

# --- ECOS (한국은행 경제통계시스템) ---
ECOS_BASE_URL = "https://ecos.bok.or.kr/api/StatisticSearch"

# 6.2.1. 소비자동향조사(전국, 월) > 소비지출전망CSI — 확인 완료(2026-07-22)
ECOS_CSI_STAT_CODE = "511Y002"
ECOS_CSI_ITEM_CODE = "FMCB"  # 소비지출전망CSI
ECOS_CSI_TOTAL_ITEM_CODE2 = "99988"  # 전체(성별/연령 구분 없이)

# --- KOSIS (국가통계포털) ---
KOSIS_BASE_URL = "https://kosis.kr/openapi/Param/statisticsParameterData.do"

# 가계동향조사(2019년~) > 1인이상 가구(실질, 2020년 기준) > 가구당 월평균 가계수지
# 사용자 요청에 따라 명목이 아닌 실질(DT_1L9U118) 기준으로 통일.
# 이 표는 항목이 두 축으로 나뉜다: itmId=가구유형(T110=전체가구), objL1=가계수지항목(아래 각각).
# KOSIS 사이트의 분류 트리를 직접 조작해 실제 호출 파라미터를 확인해서 찾은 값 — 2026-07-22.
KOSIS_ORG_ID = "101"
KOSIS_TBL_ID = "DT_1L9U118"
KOSIS_ITM_ID_ALL_HOUSEHOLDS = "T110"  # 전체가구

KOSIS_INCOME_TBL_ID = KOSIS_TBL_ID
KOSIS_INCOME_ITM_ID = KOSIS_ITM_ID_ALL_HOUSEHOLDS
KOSIS_INCOME_ORG_ID = KOSIS_ORG_ID
KOSIS_INCOME_OBJ_L1 = "Y1"  # 처분가능소득

KOSIS_ALCOHOL_TBL_ID = KOSIS_TBL_ID
KOSIS_ALCOHOL_ITM_ID = KOSIS_ITM_ID_ALL_HOUSEHOLDS
KOSIS_ALCOHOL_ORG_ID = KOSIS_ORG_ID
KOSIS_ALCOHOL_OBJ_L1 = "J1"  # 주류(담배 제외)


def codes_ready(*codes: str) -> bool:
    """전달된 코드가 전부 채워졌는지(=TODO가 아닌지) 확인."""
    return all(bool(c) and not str(c).startswith("TODO_") for c in codes)

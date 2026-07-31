"""가구당 월평균 처분가능소득(전년동기대비 증감률) 데이터 조회. 조회할 때마다 항상 KOSIS에서 최신 값을 받아온다(캐시 없음)."""
import config
import fallback_data
from clients import kosis_client
from clients.errors import StatisticsAPIError
from utils import current_quarter

_START_QUARTER = "202201"  # YoY 계산을 위해 표시 시작 시점보다 1년 이상 앞서 요청


def get_income_yoy() -> dict:
    try:
        rows = kosis_client.fetch_statistic(
            org_id=config.KOSIS_INCOME_ORG_ID,
            tbl_id=config.KOSIS_INCOME_TBL_ID,
            itm_id=config.KOSIS_INCOME_ITM_ID,
            obj_l1=config.KOSIS_INCOME_OBJ_L1,
            prd_se="Q",
            start_prd_de=_START_QUARTER,
            end_prd_de=current_quarter(),
        )
        points = _rows_to_yoy(rows)
        result = {
            "points": points,
            "source": "live",
            "source_note": "통계청 KOSIS 가계동향조사(실질) 실시간 연동",
        }
    except StatisticsAPIError:
        result = {
            "points": fallback_data.INCOME_YOY,
            "source": "fallback",
            "source_note": fallback_data.INCOME_SOURCE_NOTE,
        }

    return result


def _rows_to_yoy(rows: list[dict]) -> list[dict]:
    """KOSIS row(PRD_DE='202601'형식, DT)를 분기순 정렬 후 전년동기대비 증감률로 변환."""
    parsed = sorted(
        (
            {"period": r["PRD_DE"], "value": float(r["DT"])}
            for r in rows
            if r.get("DT")
        ),
        key=lambda x: x["period"],
    )
    by_period = {p["period"]: p["value"] for p in parsed}

    points = []
    for p in parsed:
        year_str, q_str = p["period"][:4], p["period"][4:]
        prev_period = f"{int(year_str) - 1}{q_str}"
        prev_value = by_period.get(prev_period)
        if prev_value:
            yoy = (p["value"] - prev_value) / prev_value * 100
            points.append({
                "label": f"'{year_str[2:]} Q{int(q_str)}",
                "yoy_pct": round(yoy, 2),
                "value_krw": round(p["value"]),
            })
    return points

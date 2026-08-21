"""가구당 월평균 처분가능소득(전년동기대비 증감률) 데이터 조회.

평소에는 DB(leading_indicator.indicator_value)에 적재된 값을 읽는다 — 매일 08:00 etl.py가 채운다.
DB가 비었거나 접속이 안 되면 KOSIS를 직접 호출하고, 그것도 실패하면 스냅샷으로 내려간다.
"""
import config
import fallback_data
import indicator_repo
from clients import kosis_client
from clients.errors import StatisticsAPIError
from utils import current_quarter

_START_QUARTER = "202201"  # YoY 계산을 위해 표시 시작 시점보다 1년 이상 앞서 요청
_LIVE_NOTE = "통계청 KOSIS 가계동향조사(실질)"


def get_income_yoy() -> dict:
    stored = indicator_repo.get_quarterly("income", _LIVE_NOTE)
    if stored:
        return stored

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
            "source_note": f"{_LIVE_NOTE} 실시간 연동(DB 미적재 상태)",
            "collected_at": None,
        }
    except StatisticsAPIError:
        result = {
            "points": fallback_data.INCOME_YOY,
            "source": "fallback",
            "source_note": fallback_data.INCOME_SOURCE_NOTE,
            "collected_at": None,
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

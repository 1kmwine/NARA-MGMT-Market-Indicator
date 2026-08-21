"""소비지출전망CSI 데이터 조회.

평소에는 DB(leading_indicator.indicator_value)에 적재된 값을 읽는다 — 매일 08:00 etl.py가 채운다.
DB가 비었거나(최초 배포 직후) 접속이 안 되면 예전처럼 ECOS를 직접 호출하고,
그것도 실패하면 스냅샷으로 내려간다.
"""
from datetime import date

import config
import fallback_data
import indicator_repo
from clients import ecos_client
from clients.errors import StatisticsAPIError

_START_MONTH = "202101"
_LIVE_NOTE = "한국은행 ECOS 소비자동향조사"


def get_csi() -> dict:
    stored = indicator_repo.get_csi(_LIVE_NOTE)
    if stored:
        return stored

    try:
        end_month = date.today().strftime("%Y%m")
        rows = ecos_client.fetch_statistic(
            stat_code=config.ECOS_CSI_STAT_CODE,
            freq="M",
            start=_START_MONTH,
            end=end_month,
            item_codes=[config.ECOS_CSI_ITEM_CODE, config.ECOS_CSI_TOTAL_ITEM_CODE2],
        )
        points = [
            {
                "label": f"'{r['TIME'][2:4]}.{r['TIME'][4:6]}",
                "value": round(float(r["DATA_VALUE"])),
            }
            for r in rows
            if r.get("DATA_VALUE")
        ]
        result = {
            "points": points,
            "source": "live",
            "source_note": f"{_LIVE_NOTE} 실시간 연동(DB 미적재 상태)",
            "collected_at": None,
        }
    except StatisticsAPIError:
        result = {
            "points": fallback_data.CSI_POINTS,
            "source": "fallback",
            "source_note": "발표 시점 기준으로 확인된 값만 표시(연속 월별 시계열 아님).",
            "collected_at": None,
        }

    return result

"""소비지출전망CSI 데이터 조회."""
from datetime import date

import cache
import config
import fallback_data
from clients import ecos_client
from clients.errors import StatisticsAPIError

_CACHE_KEY = "csi_points"
_START_MONTH = "202101"


def get_csi() -> dict:
    cached = cache.get(_CACHE_KEY)
    if cached:
        return cached

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
            "source_note": "한국은행 ECOS 소비자동향조사 실시간 연동",
        }
    except StatisticsAPIError:
        result = {
            "points": fallback_data.CSI_POINTS,
            "source": "fallback",
            "source_note": "발표 시점 기준으로 확인된 값만 표시(연속 월별 시계열 아님).",
        }

    cache.set(_CACHE_KEY, result)
    return result

"""환율(원/달러, 원/유로) 데이터 조회."""
from datetime import date

import cache
import config
import fallback_data
from clients import ecos_client
from clients.errors import StatisticsAPIError

_CACHE_KEY = "fx_monthly"
_START_MONTH = "202401"


def get_fx_monthly() -> dict:
    cached = cache.get(_CACHE_KEY)
    if cached:
        return cached

    try:
        end_month = date.today().strftime("%Y%m")
        usd_rows = ecos_client.fetch_statistic(
            stat_code=config.ECOS_FX_STAT_CODE,
            freq="M",
            start=_START_MONTH,
            end=end_month,
            item_codes=[config.ECOS_FX_USD_ITEM_CODE, config.ECOS_FX_AVG_ITEM_CODE2],
        )
        eur_rows = ecos_client.fetch_statistic(
            stat_code=config.ECOS_FX_STAT_CODE,
            freq="M",
            start=_START_MONTH,
            end=end_month,
            item_codes=[config.ECOS_FX_EUR_ITEM_CODE, config.ECOS_FX_AVG_ITEM_CODE2],
        )
        result = {
            "points": _merge_rows(usd_rows, eur_rows),
            "source": "live",
            "source_note": "한국은행 ECOS 실시간 연동",
        }
    except StatisticsAPIError:
        result = {
            "points": fallback_data.FX_MONTHLY,
            "source": "fallback",
            "source_note": fallback_data.FX_SOURCE_NOTE,
        }

    cache.set(_CACHE_KEY, result)
    return result


def _merge_rows(usd_rows: list[dict], eur_rows: list[dict]) -> list[dict]:
    eur_by_time = {r["TIME"]: float(r["DATA_VALUE"]) for r in eur_rows if r.get("DATA_VALUE")}
    points = []
    for r in usd_rows:
        if not r.get("DATA_VALUE"):
            continue
        time_key = r["TIME"]  # 예: '202501'
        points.append({
            "label": f"'{time_key[2:4]}.{time_key[4:6]}",
            "usd": round(float(r["DATA_VALUE"]), 2),
            "eur": eur_by_time.get(time_key),
            "est": False,
        })
    return points

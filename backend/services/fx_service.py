"""환율(원/달러, 원/유로) 데이터 조회.

월평균(기본값)은 DB(leading_indicator.indicator_value)에 적재된 값을 읽는다 — 매일 08:00 etl.py가 채운다.
DB가 비었거나 접속이 안 되면 ECOS를 직접 호출하고, 그것도 실패하면 스냅샷으로 내려간다.
월말 기준(eom)은 사용 빈도가 낮은 보조 뷰라 DB에 적재하지 않고 항상 라이브 조회 → 실패시 스냅샷.
"조회 시점 환율" 카드도 DB(일별 최근 영업일 적재분)를 먼저 읽고, 없으면 라이브 조회로 내려간다.
"""
from datetime import date, timedelta

import config
import fallback_data
import indicator_repo
from clients import ecos_client
from clients.errors import StatisticsAPIError

_START_MONTH = "202401"
_LIVE_NOTE = "한국은행 ECOS 환율(월평균)"
_DAILY_LIVE_NOTE = "한국은행 ECOS 환율(일별 매매기준율)"


def get_fx_monthly(basis: str = "avg") -> dict:
    """basis: 'avg'(월평균, 기본값 — DB 우선) 또는 'eom'(월말 기준 — 항상 라이브 조회)."""
    if basis == "avg":
        stored = indicator_repo.get_fx(_LIVE_NOTE)
        if stored:
            return stored

    item_code2 = config.ECOS_FX_EOM_ITEM_CODE2 if basis == "eom" else config.ECOS_FX_AVG_ITEM_CODE2
    basis_label = "월말" if basis == "eom" else "월평균"

    try:
        end_month = date.today().strftime("%Y%m")
        usd_rows = ecos_client.fetch_statistic(
            stat_code=config.ECOS_FX_STAT_CODE,
            freq="M",
            start=_START_MONTH,
            end=end_month,
            item_codes=[config.ECOS_FX_USD_ITEM_CODE, item_code2],
        )
        eur_rows = ecos_client.fetch_statistic(
            stat_code=config.ECOS_FX_STAT_CODE,
            freq="M",
            start=_START_MONTH,
            end=end_month,
            item_codes=[config.ECOS_FX_EUR_ITEM_CODE, item_code2],
        )
        result = {
            "points": _merge_rows(usd_rows, eur_rows),
            "basis": basis,
            "source": "live",
            "source_note": f"한국은행 ECOS 실시간 연동 ({basis_label}, DB 미적재 상태)",
            "collected_at": None,
        }
    except StatisticsAPIError:
        result = {
            "points": fallback_data.FX_MONTHLY,
            "basis": basis,
            "source": "fallback",
            "source_note": fallback_data.FX_SOURCE_NOTE,
            "collected_at": None,
        }

    return result


def get_fx_latest() -> dict:
    """조회 시점(오늘) 기준 가장 최근 영업일의 원/달러·원/유로 환율. DB를 먼저 읽는다."""
    stored = indicator_repo.get_fx_daily(_DAILY_LIVE_NOTE)
    if stored:
        return stored

    try:
        end = date.today()
        start = end - timedelta(days=10)  # 주말/공휴일을 감안해 넉넉히 10일 조회 후 가장 최근 값만 사용
        usd_rows = ecos_client.fetch_statistic(
            stat_code=config.ECOS_FX_DAILY_STAT_CODE,
            freq="D",
            start=start.strftime("%Y%m%d"),
            end=end.strftime("%Y%m%d"),
            item_codes=[config.ECOS_FX_USD_ITEM_CODE],
        )
        eur_rows = ecos_client.fetch_statistic(
            stat_code=config.ECOS_FX_DAILY_STAT_CODE,
            freq="D",
            start=start.strftime("%Y%m%d"),
            end=end.strftime("%Y%m%d"),
            item_codes=[config.ECOS_FX_EUR_ITEM_CODE],
        )
        if not usd_rows:
            raise StatisticsAPIError("최근 일별 환율 데이터가 없습니다")
        last_usd = usd_rows[-1]
        last_eur = eur_rows[-1] if eur_rows else None
        time_key = last_usd["TIME"]  # YYYYMMDD
        result = {
            "date": f"{time_key[:4]}.{time_key[4:6]}.{time_key[6:8]}",
            "usd": round(float(last_usd["DATA_VALUE"]), 2),
            "eur": round(float(last_eur["DATA_VALUE"]), 2) if last_eur and last_eur.get("DATA_VALUE") else None,
            # 전일(=직전 영업일) 값. 화면에서 전일대비 증감을 계산해 보여준다.
            "usd_prev": _prev_value(usd_rows),
            "eur_prev": _prev_value(eur_rows),
            "source": "live",
            "source_note": f"{_DAILY_LIVE_NOTE} (DB 미적재 상태)",
            "collected_at": None,
        }
    except StatisticsAPIError:
        result = {
            "usd_prev": None,
            "eur_prev": None,
            **fallback_data.FX_LATEST,
            "source": "fallback",
            "source_note": fallback_data.FX_SOURCE_NOTE,
            "collected_at": None,
        }

    return result


def _prev_value(rows: list[dict]) -> float | None:
    """직전 영업일 값. 조회 구간에 하루치밖에 없으면 None(화면에서 증감 표시를 생략한다)."""
    if len(rows) < 2 or not rows[-2].get("DATA_VALUE"):
        return None
    return round(float(rows[-2]["DATA_VALUE"]), 2)


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

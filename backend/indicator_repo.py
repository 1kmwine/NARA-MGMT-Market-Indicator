"""MariaDB(leading_indicator 스키마)에 적재해 둔 지표 시계열을 읽어온다.

화면 요청 때마다 ECOS/KOSIS를 부르지 않고 여기서 읽는다.
적재는 하루 한 번 etl.py가 담당한다(개발서버 cron 매일 08:00).
"""
import logging
from decimal import Decimal

import db

logger = logging.getLogger(__name__)


def _to_float(value) -> float:
    return float(value) if isinstance(value, Decimal) else float(value)


def _fetch(code: str, *, require_yoy: bool) -> list[dict]:
    """지표 하나의 시계열을 period 오름차순으로 읽는다.

    require_yoy=True면 전년동기대비 증감률이 계산된 행만 반환한다.
    (분기 지표는 시계열 첫 1년치에 YoY가 없는데, 화면은 YoY를 그리므로 제외해야 한다.)
    """
    sql = """
        SELECT period, label, value, yoy_pct, origin, collected_at
        FROM indicator_value
        WHERE indicator_code = %s
    """
    if require_yoy:
        sql += " AND yoy_pct IS NOT NULL"
    sql += " ORDER BY period"

    try:
        with db.connect() as conn, conn.cursor() as cur:
            cur.execute(sql, (code,))
            return cur.fetchall()
    except Exception as exc:
        # DB가 죽어도 화면은 떠야 한다 — 빈 목록을 주면 호출한 서비스가 API 직접 호출로 넘어간다.
        logger.warning("indicator_value 조회 실패(%s): %s", code, exc)
        return []


def _meta(rows: list[dict], base_note: str) -> dict:
    """배지(source)와 출처 문구를 만든다.

    한 행이라도 스냅샷(fallback)으로 적재됐으면 '실시간'이라고 할 수 없으므로 fallback으로 본다.
    """
    source = "live" if all(r["origin"] == "live" for r in rows) else "fallback"
    collected_at = max(r["collected_at"] for r in rows)
    return {
        "source": source,
        "source_note": f"{base_note} (DB 적재 {collected_at:%Y-%m-%d %H:%M} 기준)",
        "collected_at": collected_at.isoformat(),
    }


def get_csi(base_note: str) -> dict | None:
    """소비지출전망CSI 월별 시계열. 적재된 행이 없으면 None."""
    rows = _fetch("csi", require_yoy=False)
    if not rows:
        return None
    return {
        "points": [{"label": r["label"], "value": round(_to_float(r["value"]))} for r in rows],
        **_meta(rows, base_note),
    }


def get_fx(base_note: str) -> dict | None:
    """원/달러·원/유로 월평균 환율. 적재된 행이 없으면 None.

    월말 기준(eom) 토글은 DB에 적재하지 않는다 — 호출한 서비스가 basis!="avg"면
    이 함수를 부르지 않고 곧장 라이브 조회로 넘어간다.
    """
    usd_rows = _fetch("fx_usd", require_yoy=False)
    if not usd_rows:
        return None
    eur_by_period = {r["period"]: r for r in _fetch("fx_eur", require_yoy=False)}

    points = [
        {
            "label": r["label"],
            "usd": _to_float(r["value"]),
            "eur": _to_float(eur_by_period[r["period"]]["value"]) if r["period"] in eur_by_period else None,
            "est": False,
        }
        for r in usd_rows
    ]
    return {"points": points, "basis": "avg", **_meta(usd_rows, base_note)}


def get_fx_daily(base_note: str) -> dict | None:
    """조회 시점 기준 가장 최근 영업일 환율(+ 전일대비 비교용 직전 값). 적재된 행이 없으면 None."""
    usd_rows = _fetch("fx_usd_daily", require_yoy=False)
    if not usd_rows:
        return None
    eur_rows = _fetch("fx_eur_daily", require_yoy=False)

    last_usd = usd_rows[-1]
    last_eur = eur_rows[-1] if eur_rows else None
    return {
        "date": f"{last_usd['period'][:4]}.{last_usd['period'][4:6]}.{last_usd['period'][6:8]}",
        "usd": _to_float(last_usd["value"]),
        "eur": _to_float(last_eur["value"]) if last_eur else None,
        "usd_prev": _to_float(usd_rows[-2]["value"]) if len(usd_rows) >= 2 else None,
        "eur_prev": _to_float(eur_rows[-2]["value"]) if len(eur_rows) >= 2 else None,
        **_meta(usd_rows, base_note),
    }


def get_quarterly(code: str, base_note: str, *, with_known: bool = False) -> dict | None:
    """분기 지표(income/alcohol)의 YoY 시계열. 적재된 행이 없으면 None.

    with_known: 주류 차트가 쓰는 known 플래그. DB 값은 전부 실측이라 항상 True.
    """
    rows = _fetch(code, require_yoy=True)
    if not rows:
        return None

    points = []
    for r in rows:
        point = {
            "label": r["label"],
            "yoy_pct": _to_float(r["yoy_pct"]),
            "value_krw": round(_to_float(r["value"])),
        }
        if with_known:
            point["known"] = True
        points.append(point)

    return {"points": points, **_meta(rows, base_note)}

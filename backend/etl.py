"""선행지표 숫자를 ECOS/KOSIS에서 받아 MariaDB(leading_indicator 스키마)에 적재한다.

  python etl.py --init   스키마/테이블 생성 (sql/schema.sql 적용, 이미 있으면 그대로 둠)
  python etl.py          지표 전부 수집 후 upsert (같은 period는 덮어씀)
  python etl.py --show   적재 결과 확인

API 호출이 실패하면 fallback_data.py의 스냅샷 값을 origin='fallback'으로 적재해
화면이 비지 않게 한다(서비스 계층의 기존 동작과 같은 원칙).
"""
import argparse
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import config  # noqa: E402
import db  # noqa: E402
import fallback_data  # noqa: E402
from clients import ecos_client, kosis_client  # noqa: E402
from clients.errors import StatisticsAPIError  # noqa: E402
from utils import current_quarter  # noqa: E402

_SCHEMA_FILE = Path(__file__).parent / "sql" / "schema.sql"
_CSI_START_MONTH = "202101"
_QUARTER_START = "202201"  # YoY 계산을 위해 표시 시작 시점보다 1년 이상 앞서 요청


# --- 지표 마스터 정의 -------------------------------------------------------

INDICATOR_MASTER = [
    {
        "code": "csi",
        "name": "소비지출전망CSI",
        "source_org": "ECOS",
        "source_table": config.ECOS_CSI_STAT_CODE,
        "source_param": f"item={config.ECOS_CSI_ITEM_CODE}/{config.ECOS_CSI_TOTAL_ITEM_CODE2}",
        "unit": "지수",
        "period_type": "M",
        "note": "한국은행 소비자동향조사(전국, 월). 100 초과면 지출을 늘리겠다는 응답이 우세.",
    },
    {
        "code": "income",
        "name": "가구당 월평균 처분가능소득(실질)",
        "source_org": "KOSIS",
        "source_table": config.KOSIS_INCOME_TBL_ID,
        "source_param": f"itmId={config.KOSIS_INCOME_ITM_ID}&objL1={config.KOSIS_INCOME_OBJ_L1}",
        "unit": "원",
        "period_type": "Q",
        "note": fallback_data.INCOME_SOURCE_NOTE,
    },
    {
        "code": "alcohol",
        "name": "주류 소비지출(가구당 월평균, 실질)",
        "source_org": "KOSIS",
        "source_table": config.KOSIS_ALCOHOL_TBL_ID,
        "source_param": f"itmId={config.KOSIS_ALCOHOL_ITM_ID}&objL1={config.KOSIS_ALCOHOL_OBJ_L1}",
        "unit": "원",
        "period_type": "Q",
        "note": fallback_data.ALCOHOL_SUMMARY["source_note"],
    },
    {
        "code": "fx_usd",
        "name": "원/달러 환율(월평균)",
        "source_org": "ECOS",
        "source_table": config.ECOS_FX_STAT_CODE,
        "source_param": f"item={config.ECOS_FX_USD_ITEM_CODE}/{config.ECOS_FX_AVG_ITEM_CODE2}",
        "unit": "원",
        "period_type": "M",
        "note": fallback_data.FX_SOURCE_NOTE,
    },
    {
        "code": "fx_eur",
        "name": "원/유로 환율(월평균)",
        "source_org": "ECOS",
        "source_table": config.ECOS_FX_STAT_CODE,
        "source_param": f"item={config.ECOS_FX_EUR_ITEM_CODE}/{config.ECOS_FX_AVG_ITEM_CODE2}",
        "unit": "원",
        "period_type": "M",
        "note": fallback_data.FX_SOURCE_NOTE,
    },
    {
        "code": "fx_usd_daily",
        "name": "원/달러 환율(일별 매매기준율)",
        "source_org": "ECOS",
        "source_table": config.ECOS_FX_DAILY_STAT_CODE,
        "source_param": f"item={config.ECOS_FX_USD_ITEM_CODE}",
        "unit": "원",
        "period_type": "D",
        "note": "조회 시점 기준 가장 최근 영업일 환율 표시용 (최근 10영업일 보관).",
    },
    {
        "code": "fx_eur_daily",
        "name": "원/유로 환율(일별 매매기준율)",
        "source_org": "ECOS",
        "source_table": config.ECOS_FX_DAILY_STAT_CODE,
        "source_param": f"item={config.ECOS_FX_EUR_ITEM_CODE}",
        "unit": "원",
        "period_type": "D",
        "note": "조회 시점 기준 가장 최근 영업일 환율 표시용 (최근 10영업일 보관).",
    },
]


# --- 수집 -------------------------------------------------------------------

def _month_label(period: str) -> str:
    return f"'{period[2:4]}.{period[4:6]}"


def _quarter_label(period: str) -> str:
    return f"'{period[2:4]} Q{int(period[4:])}"


def _label_to_period(label: str) -> str:
    """fallback 스냅샷의 라벨을 period 문자열로 되돌린다 ('26.04 -> 202604, '26 Q1 -> 202601)."""
    body = label.lstrip("'")
    if "." in body:  # 월
        yy, mm = body.split(".")
        return f"20{yy}{int(mm):02d}"
    yy, q = body.split(" Q")  # 분기
    return f"20{yy}{int(q):02d}"


def fetch_csi() -> tuple[list[dict], str]:
    """ECOS 소비지출전망CSI 월별 시계열."""
    try:
        rows = ecos_client.fetch_statistic(
            stat_code=config.ECOS_CSI_STAT_CODE,
            freq="M",
            start=_CSI_START_MONTH,
            end=date.today().strftime("%Y%m"),
            item_codes=[config.ECOS_CSI_ITEM_CODE, config.ECOS_CSI_TOTAL_ITEM_CODE2],
        )
    except StatisticsAPIError:
        return [
            {
                "period": _label_to_period(p["label"]),
                "label": p["label"],
                "value": p["value"],
                "yoy_pct": None,
            }
            for p in fallback_data.CSI_POINTS
        ], "fallback"

    return [
        {
            "period": r["TIME"],
            "label": _month_label(r["TIME"]),
            "value": float(r["DATA_VALUE"]),
            "yoy_pct": None,
        }
        for r in rows
        if r.get("DATA_VALUE")
    ], "live"


def _fetch_quarterly(obj_l1: str, snapshot: list[dict]) -> tuple[list[dict], str]:
    """KOSIS 가계동향조사 분기 시계열을 받아 전년동기대비 증감률까지 계산해 돌려준다."""
    try:
        rows = kosis_client.fetch_statistic(
            org_id=config.KOSIS_ORG_ID,
            tbl_id=config.KOSIS_TBL_ID,
            itm_id=config.KOSIS_ITM_ID_ALL_HOUSEHOLDS,
            obj_l1=obj_l1,
            prd_se="Q",
            start_prd_de=_QUARTER_START,
            end_prd_de=current_quarter(),
        )
    except StatisticsAPIError:
        return [
            {
                "period": _label_to_period(p["label"]),
                "label": p["label"],
                "value": p["value_krw"],
                "yoy_pct": p["yoy_pct"],
            }
            for p in snapshot
        ], "fallback"

    parsed = sorted(
        ({"period": r["PRD_DE"], "value": float(r["DT"])} for r in rows if r.get("DT")),
        key=lambda x: x["period"],
    )
    by_period = {p["period"]: p["value"] for p in parsed}

    points = []
    for p in parsed:
        year, q = p["period"][:4], p["period"][4:]
        prev = by_period.get(f"{int(year) - 1}{q}")
        points.append({
            "period": p["period"],
            "label": _quarter_label(p["period"]),
            "value": p["value"],
            # 전년 동분기 값이 없으면(=시계열 첫 1년) YoY는 비워 둔다
            "yoy_pct": round((p["value"] - prev) / prev * 100, 2) if prev else None,
        })
    return points, "live"


_FX_START_MONTH = "202401"


def fetch_fx_monthly(item_code: str, snapshot_key: str) -> tuple[list[dict], str]:
    """원/달러 또는 원/유로 월평균 환율. (월말 기준 토글은 화면에서 그때그때 라이브 조회 —
    사용 빈도가 낮은 보조 뷰라 DB 적재 대상에서 제외)"""
    try:
        rows = ecos_client.fetch_statistic(
            stat_code=config.ECOS_FX_STAT_CODE,
            freq="M",
            start=_FX_START_MONTH,
            end=date.today().strftime("%Y%m"),
            item_codes=[item_code, config.ECOS_FX_AVG_ITEM_CODE2],
        )
    except StatisticsAPIError:
        return [
            {
                "period": _label_to_period(p["label"]),
                "label": p["label"],
                "value": p[snapshot_key],
                "yoy_pct": None,
            }
            for p in fallback_data.FX_MONTHLY
            if p[snapshot_key] is not None
        ], "fallback"

    return [
        {
            "period": r["TIME"],
            "label": _month_label(r["TIME"]),
            "value": float(r["DATA_VALUE"]),
            "yoy_pct": None,
        }
        for r in rows
        if r.get("DATA_VALUE")
    ], "live"


def fetch_fx_daily(item_code: str) -> tuple[list[dict], str]:
    """최근 10영업일 원/달러 또는 원/유로 매매기준율(일별). "조회 시점 환율" 카드가
    가장 최근 값과 그 직전 값(전일대비)을 비교해야 해서 하루치가 아니라 며칠치를 그대로 적재한다."""
    try:
        end = date.today()
        start = end - timedelta(days=10)
        rows = ecos_client.fetch_statistic(
            stat_code=config.ECOS_FX_DAILY_STAT_CODE,
            freq="D",
            start=start.strftime("%Y%m%d"),
            end=end.strftime("%Y%m%d"),
            item_codes=[item_code],
        )
    except StatisticsAPIError:
        return [], "fallback"  # 일별 스냅샷은 안 만듦 — service 계층이 FX_LATEST로 대체한다

    return [
        {
            "period": r["TIME"],
            "label": f"{r['TIME'][:4]}.{r['TIME'][4:6]}.{r['TIME'][6:8]}",
            "value": float(r["DATA_VALUE"]),
            "yoy_pct": None,
        }
        for r in rows
        if r.get("DATA_VALUE")
    ], "live"


FETCHERS = {
    "csi": fetch_csi,
    "income": lambda: _fetch_quarterly(config.KOSIS_INCOME_OBJ_L1, fallback_data.INCOME_YOY),
    "alcohol": lambda: _fetch_quarterly(config.KOSIS_ALCOHOL_OBJ_L1, fallback_data.ALCOHOL_YOY),
    "fx_usd": lambda: fetch_fx_monthly(config.ECOS_FX_USD_ITEM_CODE, "usd"),
    "fx_eur": lambda: fetch_fx_monthly(config.ECOS_FX_EUR_ITEM_CODE, "eur"),
    "fx_usd_daily": lambda: fetch_fx_daily(config.ECOS_FX_USD_ITEM_CODE),
    "fx_eur_daily": lambda: fetch_fx_daily(config.ECOS_FX_EUR_ITEM_CODE),
}


# --- 적재 -------------------------------------------------------------------

def init_schema() -> None:
    """sql/schema.sql을 그대로 적용. CREATE ... IF NOT EXISTS라 여러 번 돌려도 안전하다."""
    statements = [s.strip() for s in _SCHEMA_FILE.read_text(encoding="utf-8").split(";") if s.strip()]
    # 스키마가 아직 없을 수 있으므로 DB를 지정하지 않고 접속한다.
    with db.connect(with_database=False) as conn:
        with conn.cursor() as cur:
            for statement in statements:
                cur.execute(statement)
    print(f"스키마 준비 완료 ({len(statements)}개 구문 적용)")


def upsert_master(conn) -> None:
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO indicator (code, name, source_org, source_table, source_param,
                                   unit, period_type, note)
            VALUES (%(code)s, %(name)s, %(source_org)s, %(source_table)s, %(source_param)s,
                    %(unit)s, %(period_type)s, %(note)s)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name), source_org = VALUES(source_org),
                source_table = VALUES(source_table), source_param = VALUES(source_param),
                unit = VALUES(unit), period_type = VALUES(period_type), note = VALUES(note)
            """,
            INDICATOR_MASTER,
        )


def upsert_values(conn, code: str, points: list[dict], origin: str) -> int:
    if not points:
        return 0
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO indicator_value (indicator_code, period, label, value, yoy_pct, origin)
            VALUES (%(indicator_code)s, %(period)s, %(label)s, %(value)s, %(yoy_pct)s, %(origin)s)
            ON DUPLICATE KEY UPDATE
                label = VALUES(label), value = VALUES(value),
                yoy_pct = VALUES(yoy_pct), origin = VALUES(origin),
                collected_at = current_timestamp()
            """,
            [{**p, "indicator_code": code, "origin": origin} for p in points],
        )
    return len(points)


def log_fetch(conn, code: str, status: str, origin: str, row_count: int,
              message: str | None, started_at: datetime) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO fetch_log (indicator_code, status, origin, row_count, message, started_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (code, status, origin, row_count, message, started_at),
        )


def run() -> int:
    """지표를 전부 수집해 적재하고, 실패한 지표 수를 반환한다."""
    failures = 0
    with db.connect() as conn:
        upsert_master(conn)
        for code, fetch in FETCHERS.items():
            started_at = datetime.now()
            try:
                points, origin = fetch()
                count = upsert_values(conn, code, points, origin)
                log_fetch(conn, code, "success", origin, count, None, started_at)
                print(f"  {code:8s} {count:3d}건 적재 (origin={origin})")
            except Exception as exc:  # 한 지표가 죽어도 나머지는 계속 적재
                failures += 1
                log_fetch(conn, code, "failed", "live", 0, str(exc)[:500], started_at)
                print(f"  {code:8s} 실패: {exc}", file=sys.stderr)
    return failures


def show() -> None:
    with db.connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT i.code, i.name, i.unit, COUNT(v.id) AS row_count,
                   MIN(v.period) AS first_period, MAX(v.period) AS last_period,
                   MAX(v.collected_at) AS collected_at
            FROM indicator i LEFT JOIN indicator_value v ON v.indicator_code = i.code
            GROUP BY i.code, i.name, i.unit ORDER BY i.code
            """
        )
        for r in cur.fetchall():
            print(f"{r['code']:8s} {r['row_count']:3d}건  "
                  f"{r['first_period']}~{r['last_period']}  "
                  f"{r['name']} ({r['unit']})  수집 {r['collected_at']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="선행지표 → MariaDB 적재")
    parser.add_argument("--init", action="store_true", help="스키마/테이블 생성")
    parser.add_argument("--show", action="store_true", help="적재 현황만 출력")
    args = parser.parse_args()

    if args.init:
        init_schema()
    if args.show:
        show()
    elif not args.init:
        sys.exit(1 if run() else 0)

"""한국은행 ECOS Open API 호출용 최소 클라이언트.

요청 URL 형식:
  https://ecos.bok.or.kr/api/StatisticSearch/{인증키}/json/kr/{시작건수}/{종료건수}/
  {통계표코드}/{주기}/{시작일자}/{종료일자}/{통계항목코드1}/{통계항목코드2}/...

문서/코드 검색: https://ecos.bok.or.kr/api/
"""
import os

import httpx

from clients.errors import StatisticsAPIError
from config import ECOS_BASE_URL, codes_ready

_TIMEOUT = 10.0


def fetch_statistic(
    stat_code: str,
    freq: str,
    start: str,
    end: str,
    item_codes: list[str],
    count: int = 1000,
) -> list[dict]:
    """통계표코드+항목코드로 ECOS 데이터를 조회해 row 목록을 반환한다.

    freq: 'A'(연), 'Q'(분기), 'M'(월), 'D'(일)
    codes_ready()가 False면(=config.py가 아직 TODO 상태) 바로 예외를 던져
    상위 서비스가 fallback으로 넘어가게 한다.
    """
    if not codes_ready(stat_code, *item_codes):
        raise StatisticsAPIError(
            f"ECOS 통계코드가 아직 설정되지 않았습니다 (stat_code={stat_code}). "
            "backend/config.py를 확인하세요."
        )

    api_key = os.getenv("ECOS_API_KEY")
    if not api_key:
        raise StatisticsAPIError("ECOS_API_KEY가 .env에 설정되어 있지 않습니다.")

    path_parts = [
        ECOS_BASE_URL,
        api_key,
        "json",
        "kr",
        "1",
        str(count),
        stat_code,
        freq,
        start,
        end,
        *item_codes,
    ]
    url = "/".join(path_parts)

    try:
        response = httpx.get(url, timeout=_TIMEOUT)
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError as exc:
        raise StatisticsAPIError(f"ECOS 요청 실패: {exc}") from exc

    if "StatisticSearch" not in payload:
        # ECOS는 에러도 200 OK로 {"RESULT": {"CODE":..., "MESSAGE":...}} 형태로 보낸다.
        message = payload.get("RESULT", {}).get("MESSAGE", "알 수 없는 오류")
        raise StatisticsAPIError(f"ECOS 응답 오류: {message}")

    return payload["StatisticSearch"].get("row", [])

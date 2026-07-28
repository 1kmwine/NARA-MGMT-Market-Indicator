"""통계청 KOSIS Open API 호출용 최소 클라이언트.

요청 URL 형식:
  https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList
  &apiKey={인증키}&itmId={항목코드}&objL1=ALL&format=json&jsonVD=Y
  &prdSe={주기}&startPrdDe={시작}&endPrdDe={종료}&orgId={기관코드}&tblId={통계표ID}

가장 정확한 방법: kosis.kr에서 원하는 통계표를 찾은 뒤 화면의 'OpenAPI' 버튼을 누르면
이 파라미터들이 자동으로 채워진 URL이 생성된다. 그 값을 그대로 config.py에 옮기면 된다.
"""
import os

import httpx

from clients.errors import StatisticsAPIError
from config import KOSIS_BASE_URL, codes_ready

_TIMEOUT = 10.0


def fetch_statistic(
    org_id: str,
    tbl_id: str,
    itm_id: str,
    obj_l1: str,
    prd_se: str,
    start_prd_de: str,
    end_prd_de: str,
) -> list[dict]:
    """tblId/itmId/objL1로 KOSIS 데이터를 조회해 row 목록을 반환한다.

    이 표(가계동향조사 가계수지)는 항목이 두 축으로 나뉘어 있다:
    itmId = 가구유형(예: 전체가구 T110), objL1 = 가계수지항목(예: 주류 J1, 처분가능소득 Y1).
    (KOSIS 사이트에서 분류 트리를 직접 조작해 실제 호출되는 파라미터를 확인해서 찾은 값 — 2026-07-22)

    prd_se: 'A'(연), 'Q'(분기), 'M'(월)
    codes_ready()가 False면(=config.py가 아직 TODO 상태) 바로 예외를 던져
    상위 서비스가 fallback으로 넘어가게 한다.
    """
    if not codes_ready(tbl_id, itm_id, obj_l1):
        raise StatisticsAPIError(
            f"KOSIS 통계코드가 아직 설정되지 않았습니다 (tbl_id={tbl_id}). "
            "backend/config.py를 확인하세요."
        )

    api_key = os.getenv("KOSIS_API_KEY")
    if not api_key:
        raise StatisticsAPIError("KOSIS_API_KEY가 .env에 설정되어 있지 않습니다.")

    params = {
        "method": "getList",
        "apiKey": api_key,
        "itmId": itm_id,
        "objL1": obj_l1,
        "format": "json",
        "jsonVD": "Y",
        "prdSe": prd_se,
        "startPrdDe": start_prd_de,
        "endPrdDe": end_prd_de,
        "orgId": org_id,
        "tblId": tbl_id,
    }

    try:
        response = httpx.get(KOSIS_BASE_URL, params=params, timeout=_TIMEOUT)
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError as exc:
        raise StatisticsAPIError(f"KOSIS 요청 실패: {exc}") from exc

    if isinstance(payload, dict) and payload.get("err"):
        raise StatisticsAPIError(f"KOSIS 응답 오류: {payload.get('errMsg', payload['err'])}")

    if not isinstance(payload, list):
        raise StatisticsAPIError("KOSIS 응답 형식이 예상과 다릅니다.")

    return payload

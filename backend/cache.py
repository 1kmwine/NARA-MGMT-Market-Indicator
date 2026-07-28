"""
아주 단순한 파일 기반 캐시.
정부 공공 API를 매 요청마다 호출하지 않도록, 결과를 backend/cache_data.json에 저장해두고
TTL(기본 24시간) 안에는 저장된 값을 그대로 돌려준다.
"""
import json
import time
from pathlib import Path

_CACHE_FILE = Path(__file__).parent / "cache_data.json"
_DEFAULT_TTL_SECONDS = 24 * 60 * 60


def _read_all() -> dict:
    if not _CACHE_FILE.exists():
        return {}
    try:
        return json.loads(_CACHE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def _write_all(data: dict) -> None:
    _CACHE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def get(key: str, ttl_seconds: int = _DEFAULT_TTL_SECONDS):
    entry = _read_all().get(key)
    if not entry:
        return None
    if time.time() - entry["saved_at"] > ttl_seconds:
        return None
    return entry["value"]


def set(key: str, value) -> None:
    data = _read_all()
    data[key] = {"saved_at": time.time(), "value": value}
    _write_all(data)

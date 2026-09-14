"""각 섹션의 상단 인사이트 문구를 사용자가 화면에서 직접 고쳐 쓸 수 있게 저장/조회.

backend/data/insight_overrides.json에 저장한다(docker-compose에서 이 디렉터리를
볼륨 마운트해서, 코드 재배포로 컨테이너가 새로 만들어져도 값이 유지되게 함).
값이 빈 문자열이면 프론트에서 자동 생성 문구를 그대로 보여준다.
"""
import json
from pathlib import Path

_FILE = Path(__file__).parent / "data" / "insight_overrides.json"
SECTIONS = {"csi", "income", "alcohol", "fx"}


def _read() -> dict:
    if not _FILE.exists():
        return {}
    try:
        return json.loads(_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def get_all() -> dict:
    data = _read()
    return {s: data.get(s, "") for s in SECTIONS}


def set_one(section: str, text: str) -> str:
    if section not in SECTIONS:
        raise ValueError(f"알 수 없는 section: {section}")
    data = _read()
    data[section] = text
    _FILE.parent.mkdir(parents=True, exist_ok=True)
    _FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return text

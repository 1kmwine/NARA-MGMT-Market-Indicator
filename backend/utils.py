from datetime import date


def current_quarter() -> str:
    """KOSIS PRD_DE 분기 형식(예: '202601' = 2026년 1분기, 'Q' 글자 없이 2자리)으로 반환."""
    today = date.today()
    q = (today.month - 1) // 3 + 1
    return f"{today.year}{q:02d}"

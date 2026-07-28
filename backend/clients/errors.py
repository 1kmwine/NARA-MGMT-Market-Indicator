class StatisticsAPIError(Exception):
    """ECOS/KOSIS 호출이 실패했을 때(코드 미설정, 네트워크 오류, API 오류 응답 등) 발생시키는 예외.
    서비스 계층에서 이 예외를 잡아 fallback_data로 대체한다."""

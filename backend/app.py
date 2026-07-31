"""선행지표 대시보드 백엔드(API 전용) 진입점.

프론트엔드는 이제 별도 Next.js 앱(frontend/)이 서버사이드에서 이 API를 호출하는 구조라,
여기서는 정적 파일을 서빙하지 않는다.

실행: uvicorn app:app --reload
실행 후: http://localhost:8000/docs (API 테스트 화면)
"""
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).parent / ".env")  # 실행 위치와 무관하게 backend/.env를 정확히 찾도록 절대경로 지정

from services import alcohol_service, csi_service, income_service  # noqa: E402

app = FastAPI(title="선행지표 대시보드 API")

# Next.js 프론트(로컬/배포 환경 모두)와 NID 포털 등에서 이 API(/api/*)를 호출할 수 있게 허용.
# 전부 조회 전용(읽기만)이고 로그인/개인정보가 없는 공개 통계라 전체 허용해도 위험이 낮음.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/csi")
def get_csi():
    """소비지출전망CSI."""
    return csi_service.get_csi()


@app.get("/api/income")
def get_income():
    """가구당 월평균 처분가능소득 전년동기대비 증감률."""
    return income_service.get_income_yoy()


@app.get("/api/alcohol")
def get_alcohol():
    """주류 소비지출(가구당 월평균, 실질)."""
    return alcohol_service.get_alcohol()

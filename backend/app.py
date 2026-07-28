"""선행지표 대시보드 백엔드 진입점.

실행: uvicorn app:app --reload
실행 후: http://localhost:8000 (대시보드), http://localhost:8000/docs (API 테스트 화면)
"""
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv(Path(__file__).parent / ".env")  # 실행 위치와 무관하게 backend/.env를 정확히 찾도록 절대경로 지정

from services import alcohol_service, csi_service, fx_service, income_service  # noqa: E402

app = FastAPI(title="선행지표 대시보드 API")

# NID 포털 등 다른 사내 화면에서 이 API(/api/*)를 fetch로 직접 불러다 쓸 수 있게 허용.
# 전부 조회 전용(읽기만)이고 로그인/개인정보가 없는 공개 통계라 전체 허용해도 위험이 낮음.
# 나중에 NID 포털의 실제 주소가 정해지면 그 주소로 좁혀도 된다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"


@app.get("/api/fx")
def get_fx():
    """원/달러, 원/유로 월평균 환율."""
    return fx_service.get_fx_monthly()


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


# 프론트엔드 정적 파일을 같이 서빙 (CORS 설정 없이 http://localhost:8000 하나로 전체가 뜨도록)
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

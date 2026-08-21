"""선행지표 대시보드 백엔드(API 전용) 진입점.

프론트엔드는 이제 별도 Next.js 앱(frontend/)이 서버사이드에서 이 API를 호출하는 구조라,
여기서는 정적 파일을 서빙하지 않는다.

실행: uvicorn app:app --reload
실행 후: http://localhost:8000/docs (API 테스트 화면)
"""
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")  # 실행 위치와 무관하게 backend/.env를 정확히 찾도록 절대경로 지정

import insights_service  # noqa: E402
from services import alcohol_service, csi_service, income_service  # noqa: E402

app = FastAPI(title="선행지표 대시보드 API")

# Next.js 프론트(로컬/배포 환경 모두)와 NID 포털 등에서 이 API(/api/*)를 호출할 수 있게 허용.
# 통계 조회는 전부 읽기 전용이고, 인사이트 문구 편집(PUT)도 로그인/개인정보 없는 내부용
# 화면이라 전체 허용해도 위험이 낮음.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "PUT"],
    allow_headers=["*"],
)


class InsightUpdate(BaseModel):
    text: str


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


@app.get("/api/insights")
def get_insights():
    """섹션별로 사용자가 직접 고쳐 쓴 인사이트 문구(없으면 빈 문자열)."""
    return insights_service.get_all()


@app.put("/api/insights/{section}")
def put_insight(section: str, body: InsightUpdate):
    """섹션의 인사이트 문구를 저장. 빈 문자열로 저장하면 자동 생성 문구로 되돌아간다."""
    try:
        text = insights_service.set_one(section, body.text)
    except ValueError:
        raise HTTPException(status_code=404, detail="알 수 없는 section입니다")
    return {"section": section, "text": text}

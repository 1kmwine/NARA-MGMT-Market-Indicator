# NARA-MGMT-Market-Indicator (선행지표 대시보드)

와인 산업의 선행 지표를 크롤링하여 대시보드 형태로 업데이트하는 프로젝트입니다.

## 로컬 실행 가이드

소비지출전망CSI·가처분소득·주류소비 3개 지표를 보여주는 대시보드예요.
지금은 **스냅샷(임시) 데이터**로 동작하고, 한국은행 ECOS / 통계청 KOSIS 인증키와 통계코드를
채워 넣으면 **실시간 데이터**로 바뀌어요. (화면의 "스냅샷"/"실시간" 배지로 구분됩니다.)

## 1. 처음 한 번만 하는 준비

```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
copy .env.example .env
```

`.env` 파일을 열어서 발급받은 ECOS/KOSIS 인증키를 넣어주세요. (아직 없다면 비워둬도 스냅샷 데이터로 잘 동작해요.)

## 2. 실행

```bash
cd backend
.venv\Scripts\uvicorn app:app
```

## 3. 확인

브라우저에서:
- **http://localhost:8000** → 대시보드 화면
- **http://localhost:8000/docs** → API 테스트 화면 (여기서 `/api/csi`, `/api/income`, `/api/alcohol` 각각을 눌러서 데이터가 잘 나오는지 확인 가능)

코드를 고치면 서버를 껐다(Ctrl+C) 다시 켜야 반영돼요. (`--reload` 옵션은 이 프로젝트 경로의 한글 폴더명과 충돌이 있어 뺐어요.)

## 4. 실시간 데이터로 전환하기

1. `backend/.env`에 ECOS_API_KEY, KOSIS_API_KEY 입력
2. [ecos.bok.or.kr](https://ecos.bok.or.kr), [kosis.kr/openapi](https://kosis.kr/openapi)에서 통계표를 검색해
   `backend/config.py`의 `TODO_...` 값들을 실제 통계표코드/항목코드로 교체
   (KOSIS는 통계표 화면의 "OpenAPI" 버튼을 누르면 파라미터가 자동 생성됨)
3. 서버 재시작 → 해당 지표 카드의 배지가 "스냅샷"에서 "실시간"으로 바뀜

## 폴더 구조

```
backend/    FastAPI 서버 — ECOS/KOSIS 호출(조회 시마다 항상 최신값), /api/* 라우트
frontend/   실제 대시보드 화면 (index.html, app.js, styles.css)
dashboard_design/   원본 디자인 시안 (참고용, 실행되지 않음)
```

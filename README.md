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
backend/    FastAPI 서버 — /api/* 라우트(DB 조회) + etl.py(매일 08시 ECOS/KOSIS 수집·적재)
frontend/   실제 대시보드 화면 (Next.js)
dashboard_design/   원본 디자인 시안 (참고용, 실행되지 않음)
```

## 5. 데이터 흐름 — 매일 08시 수집, 화면은 DB 조회

```
[매일 08:00 cron]  etl.py  →  ECOS/KOSIS API  →  MariaDB(leading_indicator)
[사용자 접속]      Next.js  →  FastAPI /api/*  →  MariaDB(leading_indicator)
```

화면을 열 때마다 외부 통계 API를 호출하지 않는다. 하루 한 번 적재한 값을 읽어 주기 때문에
KOSIS/ECOS가 느리거나 죽어도 대시보드는 그대로 뜬다.

**단계별 안전장치** — `services/*.py`는 아래 순서로 내려간다.
1. DB(`indicator_value`)에 적재된 값 — 정상 경로
2. DB가 비었거나(최초 배포 직후) 접속 불가 → ECOS/KOSIS 직접 호출
3. 그것도 실패 → `fallback_data.py` 스냅샷

### 스키마 (테스트 서버 `192.168.47.105:3306`)

블록 전용 **`leading_indicator`** 스키마를 쓴다 (허브 아키텍처의 "블록별 스키마 분리" 원칙 —
`클로드/ARCHITECTURE.md` §4·§7 참고).

| 테이블 | 내용 |
|---|---|
| `indicator` | 지표 마스터 3건 (csi / income / alcohol) — 출처 기관·통계표코드·단위·주기 |
| `indicator_value` | 지표 시계열 실측치. `(indicator_code, period)` 유니크라 몇 번을 돌려도 덮어쓰기만 됨 |
| `fetch_log` | 수집 이력 — 언제 몇 건 넣었는지, 실패했다면 사유 |

`indicator_value.origin`이 `live`면 통계 API 실측치, `fallback`이면 API 장애로 스냅샷이 적재된 것이다.
화면의 실시간/스냅샷 배지가 이 값을 그대로 보여준다.

접속 계정은 `backend/.env`의 `DB_USER`/`DB_PASSWORD`에서 읽는다.
실제 값은 `클로드/CREDENTIALS.strategy.local.md`에 있고, `.env`는 커밋되지 않는다.

### 수동 실행

```bash
cd backend
.venv\Scripts\python etl.py --init   # 스키마/테이블 생성 (여러 번 실행해도 안전)
.venv\Scripts\python etl.py          # ECOS/KOSIS에서 받아 적재
.venv\Scripts\python etl.py --show   # 적재 현황 확인
```

### 자동 수집 (개발서버 root crontab)

```
0 8 * * * docker compose -f /var/www/NARA-MGMT-Market-Indicator/docker-compose.yml exec -T backend python etl.py >> /var/log/market-indicator-etl.log 2>&1
```

같은 서버의 다른 블록(brand-sales, import-data)과 동일한 방식이다.
실패해도 이전 적재분이 DB에 그대로 남아 있어 화면은 계속 뜬다 — `fetch_log`와 위 로그 파일에서 원인을 본다.

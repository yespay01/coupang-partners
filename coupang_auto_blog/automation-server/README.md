# 세모링크 Automation Server

Express 기반 상품 수집·가격 관측·검색 분석 서버입니다. PostgreSQL과 MinIO를 사용하며 Docker Compose의 `coupang-automation` 컨테이너로 운영합니다.

## 현재 운영 기능

- 쿠팡 상품 자동 발견과 수집
- 실제 API 응답 가격의 일별 관측 저장
- 공개 검색 수요와 쿠팡 이동 이벤트 집계
- 관리자 인증·통계·설정 API
- 네이버·Google 검색 성과 조회
- 일일 CTR 집계와 안전한 개선 후보 생성
- 로그 정리와 Slack 운영 알림

AI 리뷰·뉴스 생성 API 코드는 레거시 호환을 위해 일부 남아 있지만 운영 스케줄에서는 비활성 상태다.

## 주요 구조

```text
automation-server/
├── src/
│   ├── config/              # PostgreSQL 등 기반 설정
│   ├── cron/scheduler.js    # 고정 작업과 설정 기반 스케줄
│   ├── routes/              # 수집·관리·분석·레거시 API
│   ├── services/coupang/    # 쿠팡 API 클라이언트
│   ├── services/priceObservations.js
│   ├── services/priceObservationJob.js
│   ├── services/naverSearchAdvisor.js
│   ├── services/googleSearchConsole.js
│   ├── services/dailyMetrics.js
│   ├── services/dailyDiagnostics.js
│   └── index.js
├── db/                      # PostgreSQL 마이그레이션
├── scripts/                 # 운영·백필·진단 스크립트
├── test/                    # Node 테스트
├── Dockerfile
└── package.json
```

## 실행

```bash
npm install
cp .env.example .env
npm run dev
```

프로덕션은 저장소 루트에서 실행한다.

```bash
docker compose up -d --build automation-server
docker compose ps
docker compose logs -f automation-server
```

전체 서비스를 내리는 `docker compose down`은 단일 서비스 배포에 사용하지 않는다.

## 주요 API

```text
GET  /health
POST /api/auth/login
GET  /api/auth/me
POST /api/collect/auto
POST /api/collect/manual
GET  /api/admin/stats
POST /api/admin/cleanup-logs
```

리뷰 생성·게시 엔드포인트는 레거시 호환용이며 현재 자동 작업에서 호출하지 않는다.

## 운영 스케줄

| 시각 | 작업 | 상태 |
|---|---|---|
| 매일 17:50 KST | 상품 자동 발견·수집 | 활성 |
| 매시간 `:10` KST | 실제 가격 Search 보완 | 환경변수에 따라 활성 |
| 매일 04:20 KST | 전일 CTR 진단 | 환경변수에 따라 활성 |
| 매주 일요일 00:00 KST | 오래된 로그 정리 | 활성 |
| 30분마다 | 네이버 레거시 세션 폴백 점검 | 활성 |
| 설정값 | 리뷰·뉴스 자동 생성 | 비활성 |

스케줄러는 시스템 설정 변경을 주기적으로 읽어 상품수집·리뷰·뉴스 작업을 재구성한다. 상품수집 활성 여부와 콘텐츠 생성 활성 여부는 별도 설정이다.

## 상품 상태 원칙

- 신규 수집 상품은 `tracked`로 저장한다.
- `pending`은 과거 리뷰 승인 대기 의미이므로 신규 가격 관측 상품에 사용하지 않는다.
- 가격 관측값은 쿠팡 API 응답에서 동일 `productId`가 확인된 경우만 저장한다.
- 추정·보간 가격은 저장하지 않는다.

## 테스트

```bash
npm test
```

## 관련 문서

- [운영 현황](../docs/운영-현황-2026-09-07.md)
- [상품 지속 수집·가격 검색 정책](../docs/상품-지속수집-가격검색-운영정책.md)
- [일일 진단과 개선 후보](../docs/운영-일일진단-개선후보.md)
- [네이버 통계 자동 동기화](../docs/네이버-서치어드바이저-쿠키-갱신-가이드.md)

**마지막 업데이트:** 2026-09-08

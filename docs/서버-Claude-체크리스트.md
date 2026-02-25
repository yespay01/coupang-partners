# 서버 측 Claude 실행 체크리스트 (Git 기반)

> 최종 업데이트: 2026-02-10
> 서버 쪽 Claude에게 이 문서를 전달하고 단계별로 실행하도록 요청하세요.

---

## ⚠️ 시작 전 확인

**당신이 서버 컴퓨터에 있는지 확인:**
```bash
pwd
```
**예상 출력:** `/home/insuk/blog`

**OS 확인:**
```bash
uname -a
```
**예상 출력:** `Linux` 포함

---

## 📋 표준 배포 절차

### 1단계: Git Pull (최신 코드 받기)

```bash
cd /home/insuk/blog

# 현재 브랜치 확인
git branch

# 원격 저장소 최신 정보 가져오기
git fetch

# 원격과 로컬 비교
git status

# 최신 코드 받기
git pull
```

**예상 출력:**
```
Updating 326e234..06ae06c
Fast-forward
 ...파일 목록...
```

**충돌 발생 시:**
```bash
# ❌ 절대 코드 수정하지 말 것!
# ✅ 개발쪽에 보고:
"Git pull 중 충돌 발생. 서버에서 수정된 파일: [파일명]"
```

---

### 2단계: 환경변수 확인

```bash
# .env.production 파일 존재 확인
ls -la .env.production

# 필수 환경변수 확인
grep "FIREBASE_ADMIN_CLIENT_EMAIL" .env.production
grep "NODE_ENV" .env.production
```

**필요 시 .env.production 수정:**
```bash
nano .env.production
```
**저장:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

### 3단계: Docker 이미지 빌드

```bash
# 기존 컨테이너 중지 및 삭제
docker-compose down

# 이미지 재빌드 (캐시 없이)
docker-compose build --no-cache
```

**예상 소요 시간:** 3-5분

**예상 출력:**
```
Building web...
Step 1/10 : FROM node:18-alpine
...
Successfully built xxxxx
Successfully tagged coupang_auto_blog_web:latest
```

---

### 4단계: 서비스 실행

```bash
# 백그라운드로 서비스 시작
docker-compose up -d
```

**예상 출력:**
```
Creating coupang-blog ... done
```

---

### 5단계: 배포 확인

#### 5-1. 컨테이너 상태 확인
```bash
docker ps
```

**예상 출력:** `coupang-blog` 컨테이너가 `Up` 상태

#### 5-2. 로그 확인
```bash
docker-compose logs -f
```

**정상 출력 예시:**
```
> coupang-blog@0.1.0 start
> next start

  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000

 ✓ Ready in XXXms
```

**에러 있는 경우:** `Ctrl+C`로 종료 후 개발쪽에 에러 로그 전달

#### 5-3. 서비스 응답 확인
```bash
# 로컬 접속 테스트
curl -I http://127.0.0.1:3000

# HTTPS 접속 테스트
curl -I https://semolink.store
```

**예상 출력:**
```
HTTP/2 200
server: nginx
...
```

---

## ✅ 배포 완료 보고

모든 단계가 성공하면 다음 형식으로 보고:

```
✅ 배포 완료!

- Git pull: 성공 (XX개 파일 업데이트)
- Docker build: 성공
- 서비스 실행: 정상
- https://semolink.store 접속: 정상

컨테이너 상태: Up XX minutes
메모리 사용량: XXX MB
```

---

## ❌ 배포 실패 시

### Git Pull 실패
```bash
# 현재 상태 확인
git status

# 개발쪽에 보고
"Git pull 실패: [에러 메시지]"
```

### Docker Build 실패
```bash
# 로그 전체 복사
docker-compose build 2>&1 | tee build.log

# 개발쪽에 build.log 내용 전달
cat build.log
```

### 서비스 실행 실패
```bash
# 로그 확인
docker-compose logs

# 환경변수 확인
docker-compose config

# 개발쪽에 로그 전달
```

---

## 🔧 추가 작업

### 환경변수 변경 요청 시

```bash
# .env.production 수정
nano .env.production

# 변경 후 재배포 (위 3-5단계 다시 실행)
docker-compose down
docker-compose up -d
```

### 로그 확인 요청 시

```bash
# 전체 로그
docker-compose logs

# 최근 100줄
docker-compose logs --tail 100

# 실시간 로그
docker-compose logs -f
```

### 긴급 재시작 요청 시

```bash
# 재시작 (코드 변경 없음)
docker-compose restart

# 완전 재시작 (재빌드 없음)
docker-compose down
docker-compose up -d
```

---

## 🚨 절대 금지 사항

**❌ 다음 작업은 절대 하지 마세요:**

1. **코드 파일 수정**
   - `nano app/page.tsx` ← 금지!
   - `vim components/*.tsx` ← 금지!
   - 모든 소스 코드 수정 금지

2. **Git 커밋**
   - `git add .` ← 금지!
   - `git commit` ← 금지!
   - `git push` ← 금지!

3. **설정 파일 수정 (환경변수 제외)**
   - `Dockerfile` 수정 금지
   - `docker-compose.yml` 수정 금지
   - `next.config.ts` 수정 금지

**✅ 유일하게 수정 가능:**
- `.env.production` (환경변수만)

---

## 📞 커뮤니케이션

### 정상 배포
```
✅ 배포 완료
- Git: 최신 코드 반영 (커밋 06ae06c)
- 서비스: 정상 실행 중
- 접속: https://semolink.store 정상
```

### 에러 발생
```
❌ [단계명] 실패
- 에러: [에러 메시지]
- 로그: [관련 로그]
- 시도: [해결 시도 내용]
```

### 확인 필요
```
⚠️ [상황 설명]
- 현재 상태: [상태]
- 질문: [확인 필요한 내용]
```

---

## 🎯 빠른 참조

```bash
# 표준 배포 (한 번에 실행)
cd /home/insuk/blog && \
git pull && \
docker-compose down && \
docker-compose build --no-cache && \
docker-compose up -d && \
docker-compose logs -f

# 상태 확인
docker ps && curl -I http://127.0.0.1:3000

# 로그 확인
docker-compose logs --tail 100

# 재시작
docker-compose restart
```

---

**기억하세요:**
- 서버 = Git Pull + 빌드 + 실행만!
- 코드 수정 = 개발 컴퓨터에서만!
- 문제 발생 = 개발쪽에 보고!

# 서버 측 Claude 실행 체크리스트

서버 쪽 Claude에게 이 문서를 전달하고 단계별로 실행하도록 요청하세요.

---

## ✅ 사전 확인

파일이 서버에 업로드되었는지 확인:

```bash
ls -la /home/insuk/blog/
```

**필수 파일:**
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `.env.production`
- `nginx-semolink.conf`
- `deploy-server.sh`
- `package.json`
- `next.config.ts`
- `app/`, `components/`, `hooks/`, `stores/`, `types/`, `public/` 디렉토리

---

## 📝 단계별 실행

### 1단계: 프로젝트 디렉토리 확인

```bash
cd /home/insuk/blog
pwd
ls -la
```

**예상 출력:** `/home/insuk/blog`

---

### 2단계: Firebase Admin SDK 키 설정

`.env.production` 파일 편집:

```bash
nano .env.production
```

**수정할 항목:**
```bash
# 실제 값으로 교체 필요
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@blog-automation-23092.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n실제키내용\n-----END PRIVATE KEY-----\n"
```

**저장:** `Ctrl+O`, `Enter`, `Ctrl+X`

**확인:**
```bash
grep "FIREBASE_ADMIN_CLIENT_EMAIL" .env.production
```

---

### 3단계: 배포 스크립트 실행 권한 부여

```bash
chmod +x deploy-server.sh
```

---

### 4단계: 배포 실행

```bash
./deploy-server.sh
```

**예상 출력:**
```
==========================================
쿠팡 자동 블로그 배포 시작
==========================================

[1/6] 기존 컨테이너 중지 중...
[2/6] 환경변수 파일 확인...
✅ .env.production 파일 확인됨
[3/6] Docker 이미지 빌드 중...
[4/6] 컨테이너 시작 중...
[5/6] 컨테이너 상태 확인...
[6/6] 헬스체크...
✅ Next.js 앱이 정상적으로 실행 중입니다!

==========================================
✅ 배포 완료!
==========================================
```

**에러 발생 시:**
```bash
# 로그 확인
docker logs coupang-blog

# 컨테이너 상태 확인
docker ps -a | grep coupang-blog

# 환경변수 확인
docker exec coupang-blog env | grep FIREBASE
```

---

### 5단계: Nginx 설정 업데이트

```bash
# Nginx 설정 파일 복사
sudo cp nginx-semolink.conf /etc/nginx/sites-available/semolink-blog

# 기존 설정 백업 (선택사항)
sudo cp /etc/nginx/sites-available/semolink-blog /etc/nginx/sites-available/semolink-blog.backup.$(date +%Y%m%d)

# Nginx 설정 테스트
sudo nginx -t
```

**예상 출력:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

```bash
# Nginx 재시작
sudo systemctl reload nginx
```

---

### 6단계: 배포 확인

#### 6-1. 로컬 테스트
```bash
curl http://127.0.0.1:3000
```

**예상 출력:** HTML 응답 (Next.js 페이지)

#### 6-2. HTTPS 테스트
```bash
curl -I https://semolink.store
```

**예상 출력:**
```
HTTP/2 200
server: nginx/1.18.0
...
```

#### 6-3. Docker 로그 확인
```bash
docker logs -f coupang-blog
```

**예상 출력:**
```
> coupang-blog@0.1.0 start
> next start

  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000
  - Network:      http://0.0.0.0:3000

 ✓ Ready in XXXms
```

#### 6-4. Nginx 로그 확인
```bash
sudo tail -f /var/log/nginx/semolink-blog-access.log
```

---

## 🎉 최종 확인

브라우저에서 접속:
- ✅ https://semolink.store
- ✅ https://semolink.store/admin

---

## 🔧 문제 해결

### 컨테이너가 시작되지 않을 때

```bash
# 1. 로그 확인
docker logs coupang-blog

# 2. 환경변수 확인
docker exec coupang-blog env

# 3. 컨테이너 재시작
docker-compose restart

# 4. 완전히 재배포
docker-compose down
docker-compose up -d --build
```

### Nginx 502 Bad Gateway

```bash
# 1. Next.js 앱 동작 확인
curl http://127.0.0.1:3000

# 2. 컨테이너 상태 확인
docker ps | grep coupang-blog

# 3. Nginx 설정 확인
sudo nginx -t

# 4. Nginx 재시작
sudo systemctl restart nginx
```

### 환경변수 문제

```bash
# .env.production 파일 확인
cat .env.production

# Firebase Admin SDK 키 형식 확인
# - PRIVATE_KEY는 따옴표로 감싸야 함
# - \n은 실제 줄바꿈이 아니라 문자열 \n 그대로
```

---

## 📞 완료 보고

모든 단계가 완료되면 다음 정보를 보고:

1. ✅ 배포 성공 여부
2. ✅ https://semolink.store 접속 가능 여부
3. ✅ Docker 컨테이너 상태
4. ✅ 에러 로그 (있다면)

**예시:**
```
✅ 배포 완료!
- https://semolink.store 정상 접속됨
- Docker 컨테이너 실행 중 (Up 5 minutes)
- 에러 없음
```

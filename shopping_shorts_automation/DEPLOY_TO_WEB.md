# 웹으로 배포하기 가이드

## 🌐 목표

**현재**: 컴퓨터에 설치해서 사용
**목표**: 웹사이트처럼 링크만 클릭하면 사용

---

## 방법 1: Streamlit Community Cloud (무료, 추천!)

### 📋 필요한 것
- [x] GitHub 계정 (있음)
- [x] GitHub에 코드 업로드 (완료됨)
- [ ] Streamlit 계정 (무료 가입)

### 🎯 결과
```
https://coupang-shorts.streamlit.app
    ↓
어디서든, 누구든, 링크만 클릭!
```

---

## 🚀 배포 단계 (10분)

### 1단계: Streamlit 계정 만들기

1. https://share.streamlit.io 접속
2. **"Sign up"** 클릭
3. **"Continue with GitHub"** 선택
4. GitHub 계정으로 로그인
5. 권한 승인

### 2단계: 앱 배포하기

1. Streamlit Cloud 대시보드에서 **"New app"** 클릭

2. 설정:
   ```
   Repository: yespay01/coupang-partners
   Branch: main
   Main file path: shopping_shorts_automation/app/main.py
   ```

3. **"Advanced settings"** 클릭

4. **Secrets** 섹션에 추가:
   ```toml
   OPENAI_API_KEY = "sk-proj-여기에_당신의_API키"
   OPENAI_MODEL = "gpt-4o-mini"
   ```

5. **"Deploy!"** 클릭

### 3단계: 완료!

- 3~5분 후 배포 완료
- 링크가 생성됨: `https://your-app.streamlit.app`
- 이 링크를 북마크하거나 공유!

---

## 🔒 보안 설정

### Private 앱으로 만들기 (본인만 사용)

1. Streamlit Cloud 대시보드
2. 앱 설정 → **Settings**
3. **Sharing** 탭
4. **"Private"** 선택
5. 허용할 이메일 추가

### 팀원과 공유

1. **Settings** → **Sharing**
2. 팀원 이메일 추가
3. 팀원도 Streamlit 계정으로 로그인 후 접속

---

## 📱 사용 방법

### 배포 후

```
1. 링크 공유: https://your-app.streamlit.app

2. 누구나(또는 허용된 사람만):
   - 링크 클릭
   - 바로 사용!
   - 설치 필요 없음
   - PC, 맥, 스마트폰 모두 가능
```

---

## 💰 비용

### Streamlit Community Cloud
- **무료!**
- 제한:
  - 공개 앱 무제한
  - Private 앱 1개
  - 리소스 제한 (메모리 1GB, CPU 1 core)

### 더 많이 필요하면?
- **Streamlit Cloud Pro**: $20/월
  - Private 앱 무제한
  - 더 많은 리소스

---

## 🔄 업데이트 방법

### 코드 수정 후

```bash
# 로컬에서 코드 수정
git add .
git commit -m "update"
git push

# Streamlit Cloud가 자동으로 감지하고 재배포!
# 1~2분 후 자동 업데이트
```

**매우 간편합니다!**

---

## 방법 2: 사내 서버 배포

### 상황
- 인터넷에 공개하고 싶지 않음
- 회사 내부에서만 사용

### 필요한 것
- 회사 서버 (Windows Server 또는 Linux)
- 고정 IP 또는 내부 도메인

### 배포 방법

**Windows Server**:
```bash
# 서버에 프로젝트 복사
git clone https://github.com/yespay01/coupang-partners.git

# 설정
cd coupang-partners/shopping_shorts_automation
SETUP.bat

# 실행 (백그라운드)
streamlit run app/main.py --server.port 8501 --server.address 0.0.0.0
```

**Linux Server**:
```bash
# 프로젝트 복사
git clone https://github.com/yespay01/coupang-partners.git

# 가상환경 설정
cd coupang-partners/shopping_shorts_automation
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 백그라운드 실행
nohup streamlit run app/main.py --server.port 8501 --server.address 0.0.0.0 &
```

### 접속
```
http://서버IP:8501
또는
http://회사도메인:8501
```

---

## 방법 3: Docker로 배포

### Dockerfile 생성

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY shopping_shorts_automation/requirements.txt .
RUN pip install -r requirements.txt

COPY shopping_shorts_automation/ .

EXPOSE 8501

CMD ["streamlit", "run", "app/main.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

### 실행
```bash
docker build -t shopping-shorts .
docker run -p 8501:8501 -e OPENAI_API_KEY=your_key shopping-shorts
```

---

## 📊 방법 비교

| 방법 | 난이도 | 비용 | 접근성 | 추천도 |
|------|-------|------|--------|--------|
| **Streamlit Cloud** | ⭐ (쉬움) | 무료 | 어디서든 | ⭐⭐⭐⭐⭐ |
| **사내 서버** | ⭐⭐⭐ (중간) | 서버 비용 | 사내만 | ⭐⭐⭐ |
| **Docker** | ⭐⭐⭐⭐ (어려움) | 서버 비용 | 설정 가능 | ⭐⭐ |

---

## 🎯 추천

### 개인 사용 또는 소규모 팀
→ **Streamlit Cloud** (무료, 간편)

### 회사 전체 사용 (보안 중요)
→ **사내 서버 배포**

### 대규모 서비스
→ **AWS/GCP + Docker**

---

## ✅ Streamlit Cloud 배포 체크리스트

- [ ] Streamlit 계정 생성 (GitHub 연동)
- [ ] New app 클릭
- [ ] Repository 선택 (yespay01/coupang-partners)
- [ ] Main file 경로 입력 (shopping_shorts_automation/app/main.py)
- [ ] Secrets에 OPENAI_API_KEY 입력
- [ ] Deploy 클릭
- [ ] 배포 완료 대기 (3~5분)
- [ ] 링크 복사 및 북마크
- [ ] 접속 테스트

---

## 🆘 문제 해결

### 문제 1: 배포 실패
**원인**: requirements.txt 경로 문제
**해결**: Main file path를 정확히 입력

### 문제 2: API 키 오류
**원인**: Secrets 설정 안 함
**해결**: Advanced settings → Secrets 추가

### 문제 3: 앱이 느림
**원인**: 무료 플랜 리소스 제한
**해결**:
- 코드 최적화
- 또는 Pro 플랜 업그레이드

---

## 📞 다음 단계

1. **지금 바로**: Streamlit Cloud 배포 (10분)
2. **테스트**: 링크로 접속해보기
3. **공유**: 팀원에게 링크 전달

---

**링크만 클릭하면 바로 사용하는 웹앱 완성!** 🎉

**작성일**: 2025-10-31

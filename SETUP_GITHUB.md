# GitHub 설정 가이드 (초보자용)

## ✅ 준비 완료
- [x] Git 설치됨 (v2.50.1)
- [x] GitHub 계정 있음

---

## 📝 단계별 설정 (따라하기)

### 1단계: Git 사용자 설정

터미널(Git Bash)에서 실행:

```bash
# GitHub 계정 정보로 설정
git config --global user.name "당신의 GitHub 사용자명"
git config --global user.email "github@email.com"

# 확인
git config --global user.name
git config --global user.email
```

---

### 2단계: Git 저장소 초기화

```bash
# 프로젝트 폴더로 이동
cd "C:/Users/sakai/OneDrive/바탕 화면/Coupang partnner"

# Git 초기화
git init

# 확인 (현재 상태 보기)
git status
```

---

### 3단계: 첫 번째 커밋

```bash
# 모든 파일 추가
git add .

# 커밋 (변경사항 저장)
git commit -m "chore: 프로젝트 초기 설정 및 구조화"

# 확인
git log --oneline
```

---

### 4단계: GitHub에 Repository 생성

1. **GitHub 웹사이트 접속**: https://github.com
2. **로그인**
3. **오른쪽 상단 `+` 클릭** → `New repository`
4. **Repository 설정**:
   - **Repository name**: `coupang-partners` (또는 원하는 이름)
   - **Description**: "쿠팡 파트너스 자동화 프로젝트"
   - **Private** 선택 (비공개)
   - ❌ **Initialize this repository with**는 모두 체크 해제
5. **Create repository** 클릭

---

### 5단계: 로컬과 GitHub 연결

GitHub에서 Repository 생성 후 나오는 화면에서 복사:

```bash
# GitHub Repository URL로 변경
git remote add origin https://github.com/사용자명/coupang-partners.git

# 기본 브랜치 이름 설정
git branch -M main

# GitHub에 업로드
git push -u origin main
```

**인증 방법 (최초 1회)**:
- Windows: GitHub 로그인 창이 뜸 → 로그인
- 또는 Personal Access Token 사용

---

### 6단계: 다른 컴퓨터에서 Clone

```bash
# 사무실 또는 집 다른 컴퓨터에서
git clone https://github.com/사용자명/coupang-partners.git

# 폴더로 이동
cd coupang-partners

# 의존성 설치
cd shopping_shorts_automation
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

cd ../coupang_auto_blog/web
npm install
```

---

## 🔄 일상적인 사용법

### 작업 시작할 때 (사무실/집 도착)

```bash
cd "C:/Users/sakai/OneDrive/바탕 화면/Coupang partnner"

# 최신 코드 받기
git pull
```

### 작업 완료했을 때 (퇴근/집 나가기 전)

```bash
# 변경사항 확인
git status

# 모든 변경사항 추가
git add .

# 커밋 (어떤 작업했는지 메시지 작성)
git commit -m "feat: 새로운 기능 추가"

# GitHub에 업로드
git push
```

---

## 💡 커밋 메시지 작성 팁

```bash
git commit -m "타입: 간단한 설명"
```

**타입**:
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `refactor`: 코드 리팩토링
- `chore`: 설정 파일, 빌드 등

**예시**:
```bash
git commit -m "feat: Douyin 크롤링 기능 추가"
git commit -m "fix: API 호출 에러 수정"
git commit -m "docs: README 업데이트"
```

---

## ⚠️ 주의사항

### 절대 Git에 올리면 안 되는 것
- ❌ `.env` 파일 (API 키 포함)
- ❌ `node_modules/` 폴더
- ❌ `.venv/` 폴더
- ❌ 개인 정보, 비밀번호

→ 이미 `.gitignore`에 포함되어 자동 제외됨!

### 충돌 발생 시

두 컴퓨터에서 동시에 작업했다면:

```bash
git pull  # 충돌 발생 가능

# 충돌 파일 수동 수정 후
git add .
git commit -m "merge: 충돌 해결"
git push
```

---

## 🆘 문제 해결

### 문제 1: push 시 인증 오류
**해결**: GitHub Personal Access Token 생성
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → repo 체크 → Generate
3. 토큰 복사
4. `git push` 시 비밀번호 입력란에 토큰 붙여넣기

### 문제 2: 이미 다른 origin이 있다는 오류
```bash
git remote remove origin
git remote add origin https://github.com/사용자명/저장소명.git
```

### 문제 3: pull 시 충돌
```bash
# 로컬 변경사항 임시 저장
git stash

# 최신 코드 받기
git pull

# 임시 저장한 변경사항 복원
git stash pop
```

---

## 🎓 Git 기본 명령어 정리

| 명령어 | 설명 |
|-------|-----|
| `git status` | 현재 상태 확인 |
| `git add .` | 모든 변경사항 추가 |
| `git commit -m "메시지"` | 변경사항 저장 |
| `git push` | GitHub에 업로드 |
| `git pull` | GitHub에서 다운로드 |
| `git log` | 커밋 이력 보기 |
| `git diff` | 변경사항 자세히 보기 |

---

## 📚 추가 학습 자료

- [Git 공식 가이드 (한글)](https://git-scm.com/book/ko/v2)
- [GitHub Desktop](https://desktop.github.com/) - GUI 도구 (명령어 없이 사용)
- [Visual Studio Code Git 연동](https://code.visualstudio.com/docs/sourcecontrol/overview)

---

## ✨ GUI 도구 추천 (초보자)

명령어가 어렵다면 **GitHub Desktop** 사용 권장:
1. https://desktop.github.com 에서 다운로드
2. 설치 후 GitHub 로그인
3. Repository Clone
4. 변경사항을 GUI로 확인하고 커밋/푸시

---

**준비되셨나요?**
1단계(Git 사용자 설정)부터 차근차근 진행하시면 됩니다!

궁금한 점이나 오류가 발생하면 언제든 물어보세요.

**최종 업데이트**: 2025-10-31

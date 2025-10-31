# 사무실-집 프로젝트 동기화 가이드

사무실과 집에서 동일한 프로젝트를 작업하기 위한 방법들을 정리했습니다.

---

## 방법 비교

| 방법 | 난이도 | 안정성 | 협업 | 비용 | 추천도 |
|-----|-------|-------|------|------|-------|
| **1. Git + GitHub** | 중 | ⭐⭐⭐⭐⭐ | ✅ | 무료 | ⭐⭐⭐⭐⭐ |
| **2. OneDrive 동기화** | 하 | ⭐⭐⭐ | ❌ | 무료 | ⭐⭐⭐ |
| **3. Git + OneDrive** | 중 | ⭐⭐⭐⭐ | ✅ | 무료 | ⭐⭐⭐⭐ |
| **4. USB/외장하드** | 하 | ⭐⭐ | ❌ | 무료 | ⭐⭐ |

---

## 🏆 추천 방법 1: Git + GitHub (최고 권장)

### 장점
- 버전 관리 자동 (변경 이력 추적)
- 충돌 방지 및 병합 기능
- 온라인 백업 (코드 손실 방지)
- 협업 가능 (향후 팀 작업 시)
- 무료 (Private Repository 가능)

### 단점
- 초기 학습 곡선
- Git 명령어 익혀야 함

### 설정 방법

#### 1단계: Git 설치 확인
```bash
git --version
```

#### 2단계: GitHub 계정 생성
- https://github.com 에서 계정 생성
- Private Repository 생성 권한 있음 (무료)

#### 3단계: 로컬 Git 저장소 초기화
```bash
cd "C:/Users/sakai/OneDrive/바탕 화면/Coupang partnner"

# Git 초기화
git init

# 사용자 정보 설정
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 첫 커밋
git add .
git commit -m "chore: 프로젝트 초기 설정"
```

#### 4단계: GitHub에 Push
```bash
# GitHub에서 새 Repository 생성 후
git remote add origin https://github.com/[username]/coupang-partners.git
git branch -M main
git push -u origin main
```

#### 5단계: 다른 컴퓨터에서 Clone
```bash
# 사무실 또는 집 컴퓨터에서
git clone https://github.com/[username]/coupang-partners.git
cd coupang-partners
```

### 일상적인 사용법

**작업 시작 전 (사무실/집 도착)**:
```bash
git pull  # 최신 변경사항 가져오기
```

**작업 완료 후 (퇴근/집 나가기 전)**:
```bash
git add .
git commit -m "작업 내용 설명"
git push
```

### 주의사항
- ⚠️ `.env` 파일은 절대 커밋하지 마세요 (이미 .gitignore에 포함됨)
- ⚠️ API 키 등 민감 정보는 Git에 올리지 마세요
- ⚠️ `node_modules/`, `.venv/`는 자동 제외됨 (.gitignore)

---

## 🔄 방법 2: OneDrive 동기화 (간단하지만 제한적)

### 장점
- 설정 불필요 (이미 OneDrive 경로에 있음)
- 자동 동기화
- 매우 쉬움

### 단점
- 동시 편집 시 충돌 위험
- 버전 관리 어려움
- `node_modules/` 같은 대용량 폴더 동기화 문제
- 실시간 동기화로 인한 파일 잠김 이슈

### 설정 방법

#### 1단계: OneDrive 동기화 설정
- 현재 프로젝트가 이미 OneDrive 경로에 있으므로 추가 작업 불필요
- 두 컴퓨터 모두 OneDrive 로그인 필요

#### 2단계: 제외 폴더 설정 (중요!)
OneDrive에서 대용량 폴더 제외:
```
우클릭 OneDrive 아이콘 → 설정 → 계정 → 폴더 선택
```

제외할 폴더:
- `node_modules/`
- `.venv/`
- `.next/`
- `project_output/`

#### 3단계: 작업 규칙
1. **한 번에 한 곳에서만 작업**
2. 작업 전 파일이 동기화 완료되었는지 확인 (✅ 체크 표시)
3. 작업 완료 후 OneDrive 동기화 완료 대기

### 주의사항
- ⚠️ 두 곳에서 동시에 작업하면 충돌 발생
- ⚠️ 대용량 파일은 동기화가 느림
- ⚠️ node_modules는 매번 수동으로 `npm install` 필요

---

## ⚡ 방법 3: Git + OneDrive (균형잡힌 선택)

**Git 버전 관리** + **OneDrive 백업**을 결합하는 방법입니다.

### 장점
- Git의 버전 관리 기능
- OneDrive의 백업 기능
- 인터넷 없이도 작업 가능 (OneDrive 로컬 파일)

### 단점
- 약간 복잡한 설정
- OneDrive와 Git 충돌 가능성

### 설정 방법

#### 1단계: Git 저장소 초기화 (방법 1과 동일)
```bash
git init
git add .
git commit -m "Initial commit"
```

#### 2단계: OneDrive 동기화는 그대로 유지
- `.git/` 폴더는 OneDrive가 동기화
- 다른 컴퓨터에서 자동으로 Git 저장소 사용 가능

#### 3단계: GitHub도 함께 사용 (선택)
```bash
git remote add origin https://github.com/[username]/repo.git
git push -u origin main
```

### 작업 흐름
1. 작업 전: `git pull` (GitHub 사용 시) 또는 OneDrive 동기화 대기
2. 작업 중: 정상적으로 코드 작성
3. 작업 후: `git commit` → `git push` → OneDrive 동기화 대기

---

## 📦 방법 4: USB/외장하드 (비추천)

### 장점
- 인터넷 불필요
- 간단함

### 단점
- USB 분실 위험
- 수동으로 복사해야 함
- 버전 관리 불가
- 충돌 해결 어려움

### 방법
```bash
# 프로젝트 압축
tar -czf coupang_partners_$(date +%Y%m%d).tar.gz "Coupang partnner/"

# USB에 복사
# 다른 컴퓨터에서 압축 해제
```

---

## 🎯 상황별 추천

### 당신의 상황이라면?

**Git을 처음 사용한다면**:
→ **방법 2 (OneDrive)**로 시작 → 익숙해지면 **방법 1 (Git)**로 전환

**Git을 사용할 줄 안다면**:
→ **방법 1 (Git + GitHub)** 강력 추천

**최고의 안정성을 원한다면**:
→ **방법 3 (Git + OneDrive + GitHub)** - 3중 백업

**혼자만 사용하고 간단하게**:
→ **방법 2 (OneDrive)**

---

## 🛠 실전 설정 도우미

어떤 방법을 선택하시겠습니까? 선택하시면 자세한 설정을 도와드리겠습니다.

### Quick Start: Git + GitHub 설정 (5분)

```bash
# 1. Git 초기화
cd "C:/Users/sakai/OneDrive/바탕 화면/Coupang partnner"
git init

# 2. 사용자 정보 설정 (최초 1회만)
git config --global user.name "사용자이름"
git config --global user.email "이메일@example.com"

# 3. 첫 커밋
git add .
git commit -m "chore: 프로젝트 초기 설정 및 구조화"

# 4. GitHub Repository 생성 후 연결
# (GitHub 웹사이트에서 New Repository 생성)
git remote add origin https://github.com/사용자명/저장소명.git
git branch -M main
git push -u origin main

# 완료! 이제 다른 컴퓨터에서:
# git clone https://github.com/사용자명/저장소명.git
```

---

## 📚 참고 자료

- [Git 공식 가이드](https://git-scm.com/book/ko/v2)
- [GitHub Desktop](https://desktop.github.com/) - GUI로 쉽게 사용
- [VS Code Git 연동](https://code.visualstudio.com/docs/sourcecontrol/overview)

---

## ⚠️ 중요 체크리스트

작업 시작 전:
- [ ] 최신 코드 가져오기 (`git pull` 또는 OneDrive 동기화 확인)
- [ ] 충돌 파일 없는지 확인

작업 완료 후:
- [ ] 변경사항 커밋 (`git commit`)
- [ ] 원격 저장소에 푸시 (`git push`)
- [ ] OneDrive 동기화 완료 확인

절대 하지 말 것:
- ❌ `.env` 파일을 Git에 커밋
- ❌ `node_modules/`를 OneDrive 동기화
- ❌ 두 컴퓨터에서 동시에 같은 파일 편집

---

**최종 업데이트**: 2025-10-31
**작성자**: Claude Code

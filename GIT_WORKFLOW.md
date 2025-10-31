# Git 작업 워크플로우 (매일 사용)

## ⚠️ 중요: 작업 전/후 필수 명령어

---

## 🌅 작업 시작할 때 (출근/집 도착)

```bash
cd "C:/Users/sakai/OneDrive/바탕 화면/Coupang partnner"

# 최신 코드 받기
git pull
```

**이렇게 하면**:
- 다른 컴퓨터에서 작업한 내용을 받아옴
- 항상 최신 상태로 작업 시작

---

## 🌙 작업 완료했을 때 (퇴근/집 나가기 전)

```bash
# 1. 변경사항 확인
git status

# 2. 모든 변경사항 추가
git add .

# 3. 커밋 (메시지 작성)
git commit -m "feat: 오늘 작업한 내용 간단히"

# 4. GitHub에 업로드
git push
```

**한 줄로 한 번에**:
```bash
git add . && git commit -m "오늘 작업 내용" && git push
```

---

## 📝 커밋 메시지 예시

```bash
git commit -m "feat: 블로그 자동화 기능 추가"
git commit -m "fix: API 호출 버그 수정"
git commit -m "docs: README 업데이트"
git commit -m "refactor: 코드 정리"
git commit -m "chore: 의존성 업데이트"
```

---

## ⚡ 빠른 참조

| 상황 | 명령어 |
|-----|--------|
| 작업 시작 전 | `git pull` |
| 현재 상태 확인 | `git status` |
| 변경사항 저장 | `git add . && git commit -m "메시지" && git push` |
| 최근 커밋 보기 | `git log --oneline` |
| 변경사항 자세히 | `git diff` |

---

## 🚨 문제 해결

### 문제 1: pull 시 충돌 발생
```bash
# 로컬 변경사항 임시 저장
git stash

# 최신 코드 받기
git pull

# 임시 저장한 내용 복원
git stash pop

# 충돌 발생 시 파일 수동 수정 후
git add .
git commit -m "merge: 충돌 해결"
git push
```

### 문제 2: push 실패 (원격에 새 커밋 있음)
```bash
# 먼저 pull로 받아오기
git pull

# 충돌 해결 후 다시 push
git push
```

### 문제 3: 실수로 잘못 커밋함
```bash
# 마지막 커밋 취소 (변경사항은 유지)
git reset --soft HEAD~1

# 다시 커밋
git add .
git commit -m "올바른 메시지"
git push
```

---

## 📋 일일 체크리스트

### 오전 (작업 시작)
- [ ] 터미널 열기
- [ ] 프로젝트 폴더로 이동
- [ ] `git pull` 실행
- [ ] 최신 코드 받아졌는지 확인

### 오후 (작업 중간)
- [ ] 중요한 작업 완료 시마다 커밋 권장
- [ ] `git add . && git commit -m "메시지"`

### 저녁 (퇴근/집 나가기 전)
- [ ] `git status`로 미저장 파일 확인
- [ ] `git add .`
- [ ] `git commit -m "오늘 작업 내용"`
- [ ] `git push`
- [ ] GitHub에서 업로드 확인

---

## 🎯 황금 규칙

1. ✅ **작업 전 항상**: `git pull`
2. ✅ **작업 후 항상**: `git add . && git commit -m "메시지" && git push`
3. ❌ **절대 안 됨**: 두 컴퓨터에서 동시에 작업
4. ✅ **자주 커밋**: 큰 작업도 단계별로 커밋
5. ✅ **명확한 메시지**: 무엇을 했는지 간단히

---

## 🔗 GitHub Repository

**URL**: https://github.com/yespay01/coupang-partners

브라우저에서 확인하기:
- 커밋 이력 보기
- 파일 변경사항 확인
- 백업 상태 점검

---

## 📞 도움 필요 시

1. 이 파일 다시 읽기
2. `SETUP_GITHUB.md` 참고
3. `docs/SYNC_GUIDE.md` 전체 가이드

---

**마지막 업데이트**: 2025-10-31
**GitHub 계정**: yespay01
**Repository**: coupang-partners

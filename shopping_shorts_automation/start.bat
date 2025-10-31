@echo off
chcp 65001 >nul
title 쇼핑 쇼츠 자동화 프로그램

echo.
echo ================================
echo   쇼핑 쇼츠 자동화 프로그램
echo ================================
echo.

REM 프로젝트 디렉토리로 이동
cd /d "%~dp0"

REM 가상환경 확인
if not exist ".venv" (
    echo [1/3] 가상환경이 없습니다. 생성 중...
    python -m venv .venv
    echo ✓ 가상환경 생성 완료
    echo.
)

REM 가상환경 활성화
echo [2/3] 가상환경 활성화 중...
call .venv\Scripts\activate.bat

REM 패키지 확인 및 설치
echo [3/3] 필요한 패키지 확인 중...
pip list | findstr "streamlit" >nul
if errorlevel 1 (
    echo 패키지를 설치합니다. 잠시만 기다려주세요...
    pip install -r requirements.txt
    echo ✓ 패키지 설치 완료
) else (
    echo ✓ 패키지 확인 완료
)

echo.
echo ================================
echo   프로그램을 시작합니다!
echo   브라우저가 자동으로 열립니다.
echo ================================
echo.
echo 종료하려면 이 창을 닫으세요.
echo.

REM Streamlit 실행
streamlit run app/main.py

pause

@echo off
cd /d "%~dp0"

if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

pip list | findstr "streamlit" >nul
if errorlevel 1 (
    echo Installing packages...
    pip install -r requirements.txt
)

streamlit run app/main.py
pause

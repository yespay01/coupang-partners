@echo off
cd /d "%~dp0"
echo Step 1: Creating virtual environment...
python -m venv .venv
echo.
echo Step 2: Activating...
call .venv\Scripts\activate.bat
echo.
echo Step 3: Installing packages...
pip install -r requirements.txt
echo.
echo Setup complete! Now you can double-click RUN.bat to start the program.
pause

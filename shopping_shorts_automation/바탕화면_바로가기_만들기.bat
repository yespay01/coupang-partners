@echo off
chcp 65001 >nul
echo.
echo 바탕화면에 바로가기를 만듭니다...
echo.

REM 현재 디렉토리 저장
set CURRENT_DIR=%~dp0
set SHORTCUT_NAME=쇼핑 쇼츠 자동화.lnk

REM PowerShell로 바로가기 생성
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\%SHORTCUT_NAME%'); $Shortcut.TargetPath = '%CURRENT_DIR%start.bat'; $Shortcut.WorkingDirectory = '%CURRENT_DIR%'; $Shortcut.IconLocation = 'shell32.dll,137'; $Shortcut.Description = '쇼핑 쇼츠 자동화 프로그램'; $Shortcut.Save()"

echo.
echo ✓ 바탕화면에 "쇼핑 쇼츠 자동화" 바로가기가 생성되었습니다!
echo.
echo 이제 바탕화면의 바로가기를 더블클릭하면 프로그램이 실행됩니다.
echo.
pause

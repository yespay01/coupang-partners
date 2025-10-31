Dim WshShell, DesktopPath, ShortcutPath, Shortcut, ScriptDir

Set WshShell = CreateObject("WScript.Shell")

' 바탕화면 경로
DesktopPath = WshShell.SpecialFolders("Desktop")

' 바로가기 파일 경로
ShortcutPath = DesktopPath & "\Shopping Shorts Automation.lnk"

' 현재 스크립트가 있는 폴더
ScriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' 바로가기 생성
Set Shortcut = WshShell.CreateShortcut(ShortcutPath)
Shortcut.TargetPath = ScriptDir & "\start.bat"
Shortcut.WorkingDirectory = ScriptDir
Shortcut.Description = "Shopping Shorts Automation"
Shortcut.IconLocation = "shell32.dll,137"
Shortcut.Save

MsgBox "Desktop shortcut created successfully!" & vbCrLf & vbCrLf & "Double-click 'Shopping Shorts Automation' on your desktop to run the program.", vbInformation, "Success"

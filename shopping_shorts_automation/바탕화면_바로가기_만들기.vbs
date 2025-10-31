Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\쇼핑 쇼츠 자동화.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)

' 현재 스크립트가 있는 폴더 경로
strScriptPath = Replace(WScript.ScriptFullName, WScript.ScriptName, "")
oLink.TargetPath = strScriptPath & "start.bat"
oLink.WorkingDirectory = strScriptPath
oLink.Description = "쇼핑 쇼츠 자동화 프로그램"
oLink.IconLocation = "shell32.dll,137"

oLink.Save

MsgBox "바탕화면에 '쇼핑 쇼츠 자동화' 바로가기가 생성되었습니다!" & vbCrLf & vbCrLf & "이제 바탕화면의 바로가기를 더블클릭하면 프로그램이 실행됩니다.", vbInformation, "바로가기 생성 완료"

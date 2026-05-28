!include "MUI2.nsh"
!include "FileFunc.nsh"

Name "文答 Wonder"
OutFile "dist-release\文答-Setup.exe"
InstallDir "$PROGRAMFILES\Wonder"
InstallDirRegKey HKLM "Software\Wonder" "InstallDir"
RequestExecutionLevel admin

!define MUI_ICON "src-tauri\icons\icon.ico"
!define MUI_UNICON "src-tauri\icons\icon.ico"
!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

Section "安装"
  SetOutPath "$INSTDIR"
  File "src-tauri\target\release\note-forge.exe"
  File "src-tauri\icons\icon.ico"

  CreateDirectory "$INSTDIR\data"

  WriteUninstaller "$INSTDIR\uninstall.exe"

  CreateDirectory "$SMPROGRAMS\文答"
  CreateShortCut "$SMPROGRAMS\文答\文答.lnk" "$INSTDIR\note-forge.exe" "" "$INSTDIR\icon.ico"
  CreateShortCut "$SMPROGRAMS\文答\卸载文答.lnk" "$INSTDIR\uninstall.exe"
  CreateShortCut "$DESKTOP\文答.lnk" "$INSTDIR\note-forge.exe" "" "$INSTDIR\icon.ico"

  WriteRegStr HKLM "Software\Wonder" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Wonder" \
    "DisplayName" "文答 Wonder"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Wonder" \
    "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Wonder" \
    "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Wonder" \
    "Publisher" "Wonder"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Wonder" \
    "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Wonder" \
    "NoRepair" 1

  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Wonder" \
    "EstimatedSize" "$0"
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\note-forge.exe"
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR\data"
  RMDir "$INSTDIR"

  Delete "$SMPROGRAMS\文答\文答.lnk"
  Delete "$SMPROGRAMS\文答\卸载文答.lnk"
  RMDir "$SMPROGRAMS\文答"
  Delete "$DESKTOP\文答.lnk"

  DeleteRegKey HKLM "Software\Wonder"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Wonder"
SectionEnd

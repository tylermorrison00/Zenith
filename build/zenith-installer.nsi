; Zenith — NSIS assisted installer (hand-written, compiled with native Linux makensis).
;
; Why hand-written: electron-builder's NSIS target needs Wine (rcedit.exe +
; running the installer under Wine to extract the uninstaller), and Wine
; cannot launch any Windows process on this Linux VM (wineboot init wedges).
; The exe was already stamped with the Zenith icon + version info by
; build/stamp-exe.py (native, in-place). This script mirrors the
; electron-builder config in package.json:
;   oneClick false, perMachine false (per-user install, no admin),
;   allowToChangeInstallationDirectory true, desktop + start menu shortcuts.
;
; Build: makensis -DVERSION=1.0.0 -DESTIMATED_SIZE_KB=<kb> build/zenith-installer.nsi
;   (run from the repo root; SOURCEDIR defaults to release/win-unpacked)
;
!ifndef VERSION
  !define VERSION "1.0.0"
!endif
!ifndef ESTIMATED_SIZE_KB
  !define ESTIMATED_SIZE_KB "400000"
!endif
!ifndef SOURCEDIR
  !ifndef SOURCEDIR
  !define SOURCEDIR "release/win-unpacked"
!endif
!ifndef ICONFILE
  !define ICONFILE "build/icon.ico"
!endif
!endif

!define APPNAME "Zenith"
!define APPDIR "$LOCALAPPDATA\Programs\Zenith"

!ifndef OUTFILE
  !define OUTFILE "release/${APPNAME} Setup ${VERSION}.exe"
!endif

Name "${APPNAME}"
OutFile "${OUTFILE}"
InstallDir "${APPDIR}"
InstallDirRegKey HKCU "Software\Zenith" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
Icon "${ICONFILE}"
UninstallIcon "${ICONFILE}"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "FileDescription" "${APPNAME} Setup"
VIAddVersionKey "CompanyName" "${APPNAME}"
VIAddVersionKey "LegalCopyright" "Copyright (C) 2026 ${APPNAME}"
VIAddVersionKey "FileVersion" "${VERSION}.0"
VIAddVersionKey "ProductVersion" "${VERSION}.0"

!include "MUI2.nsh"
!define MUI_ABORTWARNING
!define MUI_ICON "${ICONFILE}"
!define MUI_UNICON "${ICONFILE}"
!define MUI_WELCOMEPAGE_TITLE "Welcome to ${APPNAME} Setup"
!define MUI_WELCOMEPAGE_TEXT "This will install ${APPNAME} ${VERSION} on your computer.$\r$\n$\r$\nClick Next to continue."
!define MUI_DIRECTORYPAGE_TEXT_TOP "Choose where ${APPNAME} should be installed. You can change the folder below."
!define MUI_FINISHPAGE_RUN "$INSTDIR\Zenith.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Run ${APPNAME}"
!define MUI_FINISHPAGE_LINK "Zenith — a quiet productivity workspace"
!define MUI_FINISHPAGE_LINK_LOCATION "https://github.com/tylermorrison00/Zenith"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Install" SecInstall
  SetOutPath "$INSTDIR"
  File /r "${SOURCEDIR}/*.*"

  WriteRegStr HKCU "Software\Zenith" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Zenith" "Version" "${VERSION}"
  WriteUninstaller "$INSTDIR\Uninstall ${APPNAME}.exe"

  ; Start menu + desktop shortcuts (icon = Zenith.exe's embedded Zenith icon)
  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\Zenith.exe"
  CreateShortCut "$SMPROGRAMS\${APPNAME}\Uninstall ${APPNAME}.lnk" "$INSTDIR\Uninstall ${APPNAME}.exe"
  CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\Zenith.exe"

  ; Add/Remove Programs entry (per-user)
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Publisher" "${APPNAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayIcon" "$INSTDIR\Zenith.exe,0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" "$INSTDIR\Uninstall ${APPNAME}.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "QuietUninstallString" "$INSTDIR\Uninstall ${APPNAME}.exe /S"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoRepair" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "EstimatedSize" ${ESTIMATED_SIZE_KB}
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\Uninstall ${APPNAME}.exe"
  RMDir /r "$INSTDIR"
  Delete "$DESKTOP\${APPNAME}.lnk"
  Delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
  Delete "$SMPROGRAMS\${APPNAME}\Uninstall ${APPNAME}.lnk"
  RMDir "$SMPROGRAMS\${APPNAME}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
  DeleteRegKey HKCU "Software\${APPNAME}"
  ; NOTE: %APPDATA%\Zenith (accounts, local data) is deliberately NOT deleted,
  ; so reinstalling keeps the user's workspace.
SectionEnd

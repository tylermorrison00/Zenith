@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "C:\Users\talha\Antigravity\zenith"
call npm run build
if %ERRORLEVEL% equ 0 (
    echo Build success! Copying to desktop app...
    xcopy /E /I /Y "dist\*" "C:\Users\talha\AppData\Local\Programs\Zenith\resources\app\dist\"
    echo Desktop app updated successfully!
) else (
    echo Build failed with error %ERRORLEVEL%
)

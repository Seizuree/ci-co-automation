@echo off
cd /d "D:\ci-co-automation"

echo Waiting for network...
set /a attempts=0
:check_network
ping -n 1 -w 1000 google.com >nul 2>&1
if %errorlevel%==0 goto :network_ready
set /a attempts+=1
if %attempts% GEQ 60 (
    echo Network timeout after 2 minutes, proceeding anyway...
    goto :network_ready
)
timeout /t 2 /nobreak >nul
goto :check_network

:network_ready
echo Network is ready.
pnpm run clock-out
pause

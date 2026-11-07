@echo off
title Stop Havells Solar Monitor
cd /d "%~dp0"
echo ======================================================================
echo    Stopping Havells Solar Monitor (Port 8080)...
echo ======================================================================
echo.
set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
    set FOUND=1
    echo Terminating PID %%a listening on port 8080...
    taskkill /F /PID %%a >nul 2>&1
    echo [+] Havells Solar Monitor stopped cleanly.
    goto done
)
if %FOUND%==0 echo [*] No process found listening on port 8080.
:done
echo.
pause

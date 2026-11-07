@echo off
title Enable Auto-Startup — Havells Solar Monitor
cd /d "%~dp0"
echo ======================================================================
echo    Havells Enviro Pro — Configure Auto-Startup on Windows Boot
echo ======================================================================
echo.
echo This utility configures the solar monitor to launch automatically
echo whenever your Windows PC turns on.
echo.
echo Choose your preferred startup mode:
echo   [1] Minimized Taskbar  (Recommended - quiet startup, easy to check)
echo   [2] Silent Background  (Invisible - runs like a background service)
echo   [3] Standard Window    (Normal command window + auto-open browser)
echo.
set /p choice="Select option [1, 2, or 3] (Default is 1): "
if "%choice%"=="" set choice=1

python -c "import autostart_manager; m = {'1':'minimized', '2':'silent', '3':'standard'}.get('%choice%', 'minimized'); success = autostart_manager.set_autostart(True, m); print('\n[+] SUCCESS: Auto-startup enabled in mode [' + m + ']!') if success else print('\n[-] ERROR: Failed to configure auto-startup.')"

echo.
echo The dashboard will be available at http://localhost:8080 whenever PC boots.
echo You can disable auto-startup at any time by running disable_autostart.bat
echo or via the dashboard Settings tab.
echo.
pause

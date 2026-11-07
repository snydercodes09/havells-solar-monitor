@echo off
title Disable Auto-Startup — Havells Solar Monitor
cd /d "%~dp0"
echo ======================================================================
echo    Havells Enviro Pro — Disable Auto-Startup on Windows Boot
echo ======================================================================
echo.
python -c "import autostart_manager; success = autostart_manager.set_autostart(False); print('\n[+] SUCCESS: Auto-startup disabled. Removed from Windows Startup folder.') if success else print('\n[-] ERROR: Could not remove auto-startup shortcut.')"
echo.
pause

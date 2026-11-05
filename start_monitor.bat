@echo off
title Havells Enviro Pro — Local Solar Dashboard (APDCL)
cd /d "%~dp0"
echo ======================================================================
echo    Havells Enviro Pro Local Solar Telemetry Hub (React Edition)
echo ======================================================================
echo Starting Local Backend & WebSocket Gateway on port 8080...
echo Dashboard is available at: http://localhost:8080
echo.
python main.py
pause

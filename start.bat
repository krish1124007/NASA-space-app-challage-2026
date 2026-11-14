@echo off
title SPHEREx Explorer Launcher
echo ==========================================================
echo   Launching SPHEREx Explorer ^& WiseView Scientific Suite
echo ==========================================================

cd /d "%~dp0"

set "PYEXE=%~dp0wiseview\.venv\Scripts\python.exe"
if not exist "%PYEXE%" set "PYEXE=python"

echo [1/2] Starting Backend on http://127.0.0.1:8000...
start "SPHEREx Backend" cmd /k ""%PYEXE%" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Frontend on http://127.0.0.1:3000...
start "SPHEREx Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo All services launched!
echo Open in browser: http://127.0.0.1:3000
pause

@echo off
echo ========================================
echo Starting Face2Phrase Servers
echo ========================================
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press Ctrl+C in each window to stop the servers
echo.

REM Start backend
start "Face2Phrase Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && python main.py"

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start frontend
start "Face2Phrase Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo Servers are starting...
echo Close this window when done.
pause >nul
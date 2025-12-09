@echo off
echo ========================================
echo Face2Phrase Interview Assistant Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Python and Node.js found!
echo.

REM Create virtual environment if it doesn't exist
if not exist "backend\venv" (
    echo Creating Python virtual environment...
    cd backend
    python -m venv venv
    cd ..
    echo Virtual environment created!
) else (
    echo Virtual environment already exists.
)

REM Activate virtual environment and install dependencies
echo.
echo Installing Python dependencies...
cd backend
call venv\Scripts\activate.bat

REM Try Windows-specific requirements first, fallback to regular requirements
if exist "requirements-windows.txt" (
    echo Installing Windows-compatible dependencies...
    pip install --upgrade pip
    pip install -r requirements-windows.txt
    if errorlevel 1 (
        echo Windows requirements failed, trying regular requirements...
        pip install -r requirements.txt
    )
) else (
    echo Installing regular dependencies...
    pip install --upgrade pip
    pip install -r requirements.txt
)

REM Install additional Windows-specific packages if needed
echo.
echo Installing additional Windows compatibility packages...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

cd ..

REM Install frontend dependencies
echo.
echo Installing frontend dependencies...
cd frontend
if not exist "node_modules" (
    npm install
) else (
    echo Frontend dependencies already installed.
)
cd ..

REM Create necessary directories
echo.
echo Creating necessary directories...
if not exist "backend\uploads" mkdir backend\uploads
if not exist "backend\sessions" mkdir backend\sessions
if not exist "backend\reports" mkdir backend\reports

REM Start the application
echo.
echo ========================================
echo Starting Face2Phrase Application
echo ========================================
echo.
echo Backend will start on: http://localhost:8000
echo Frontend will start on: http://localhost:3000
echo.
echo Press Ctrl+C to stop the servers
echo.

REM Start backend in a new window
start "Face2Phrase Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && python main.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in a new window
start "Face2Phrase Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo Both servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Close this window or press any key to exit setup script.
pause >nul
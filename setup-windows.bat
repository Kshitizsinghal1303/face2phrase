@echo off
echo ========================================
echo Face2Phrase Windows Setup Script
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8-3.11 from https://python.org
    pause
    exit /b 1
)

echo Python found. Setting up backend...
echo.

REM Navigate to backend directory
cd /d "%~dp0backend"

REM Remove existing virtual environment if it exists
if exist venv (
    echo Removing existing virtual environment...
    rmdir /s /q venv
)

REM Create new virtual environment
echo Creating new virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install CPU-only PyTorch first
echo Installing CPU-only PyTorch...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

REM Install other requirements
echo Installing other requirements...
pip install -r requirements-windows.txt

REM Test PyTorch installation
echo.
echo Testing PyTorch installation...
python -c "import torch; print('PyTorch version:', torch.__version__); print('CUDA available:', torch.cuda.is_available())"

echo.
echo ========================================
echo Backend setup complete!
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: Node.js is not installed
    echo Please install Node.js from https://nodejs.org
    echo Then run: npm install in the frontend directory
    echo.
    goto :backend_only
)

echo Node.js found. Setting up frontend...
echo.

REM Navigate to frontend directory
cd /d "%~dp0frontend"

REM Install frontend dependencies
echo Installing frontend dependencies...
npm install

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the application:
echo 1. Backend: cd backend ^&^& venv\Scripts\activate ^&^& python main.py
echo 2. Frontend: cd frontend ^&^& npm start
echo.
echo Demo credentials:
echo Username: demo
echo Password: demo123
echo.
goto :end

:backend_only
echo ========================================
echo Backend setup complete!
echo ========================================
echo.
echo To start the backend:
echo cd backend ^&^& venv\Scripts\activate ^&^& python main.py
echo.
echo Please install Node.js and run 'npm install' in frontend directory
echo.

:end
pause
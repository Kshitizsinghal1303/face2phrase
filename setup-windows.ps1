# Face2Phrase Windows Setup Script (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Face2Phrase Windows Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.8-3.11 from https://python.org" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Setting up backend..." -ForegroundColor Yellow
Write-Host ""

# Navigate to backend directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptPath\backend"

# Remove existing virtual environment if it exists
if (Test-Path "venv") {
    Write-Host "Removing existing virtual environment..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "venv"
}

# Create new virtual environment
Write-Host "Creating new virtual environment..." -ForegroundColor Yellow
python -m venv venv

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Install CPU-only PyTorch first
Write-Host "Installing CPU-only PyTorch..." -ForegroundColor Yellow
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install other requirements
Write-Host "Installing other requirements..." -ForegroundColor Yellow
pip install -r requirements-windows.txt

# Test PyTorch installation
Write-Host ""
Write-Host "Testing PyTorch installation..." -ForegroundColor Yellow
python -c "import torch; print('PyTorch version:', torch.__version__); print('CUDA available:', torch.cuda.is_available())"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Backend setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
    
    Write-Host "Setting up frontend..." -ForegroundColor Yellow
    Write-Host ""
    
    # Navigate to frontend directory
    Set-Location "$scriptPath\frontend"
    
    # Install frontend dependencies
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the application:" -ForegroundColor Cyan
    Write-Host "1. Backend: cd backend && .\venv\Scripts\Activate.ps1 && python main.py" -ForegroundColor White
    Write-Host "2. Frontend: cd frontend && npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "Demo credentials:" -ForegroundColor Cyan
    Write-Host "Username: demo" -ForegroundColor White
    Write-Host "Password: demo123" -ForegroundColor White
    
} catch {
    Write-Host "⚠ WARNING: Node.js is not installed" -ForegroundColor Yellow
    Write-Host "Please install Node.js from https://nodejs.org" -ForegroundColor Yellow
    Write-Host "Then run: npm install in the frontend directory" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Backend setup complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the backend:" -ForegroundColor Cyan
    Write-Host "cd backend && .\venv\Scripts\Activate.ps1 && python main.py" -ForegroundColor White
    Write-Host ""
    Write-Host "Please install Node.js and run 'npm install' in frontend directory" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
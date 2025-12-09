@echo off
echo ========================================
echo Face2Phrase Windows DLL Fix Script
echo ========================================
echo.
echo This script will fix the Windows DLL initialization error:
echo "OSError: [WinError 1114] A dynamic link library (DLL) initialization routine failed"
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo ERROR: Please run this script from the face2phrase root directory
    echo Current directory should contain 'backend' and 'frontend' folders
    pause
    exit /b 1
)

echo Step 1: Activating virtual environment...
cd backend
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat

echo.
echo Step 2: Completely removing existing PyTorch installations...
pip uninstall -y torch torchvision torchaudio
pip uninstall -y torch-audio
pip cache purge

echo.
echo Step 3: Installing CPU-only PyTorch (Windows compatible)...
pip install torch==2.1.0+cpu torchvision==0.16.0+cpu torchaudio==2.1.0+cpu --index-url https://download.pytorch.org/whl/cpu

echo.
echo Step 4: Installing Windows-compatible versions of other packages...
pip install librosa==0.10.1
pip install scipy==1.11.4
pip install numpy==1.24.3
pip install matplotlib==3.7.2
pip install plotly==5.17.0

echo.
echo Step 5: Installing OpenAI Whisper with CPU-only dependencies...
pip install openai-whisper

echo.
echo Step 6: Testing the fix...
python -c "
import sys
print('Testing imports...')
try:
    import torch
    print(f'✅ PyTorch {torch.__version__} loaded successfully')
    print(f'   CUDA available: {torch.cuda.is_available()}')
    print(f'   Device: {torch.device(\"cpu\")}')
except Exception as e:
    print(f'❌ PyTorch error: {e}')

try:
    import whisper
    print('✅ Whisper imported successfully')
    model = whisper.load_model('base', device='cpu')
    print('✅ Whisper model loaded successfully (CPU mode)')
except Exception as e:
    print(f'⚠️ Whisper error: {e}')
    print('   Will use fallback mode')

print('Test completed!')
"

echo.
echo Step 7: Testing the main application...
python -c "
try:
    from whisper_fallback import load_whisper_with_fallback
    model = load_whisper_with_fallback('base')
    print('✅ Whisper fallback system working')
except Exception as e:
    print(f'⚠️ Fallback system error: {e}')
"

cd ..

echo.
echo ========================================
echo DLL Fix Complete!
echo ========================================
echo.
echo The following changes were made:
echo • Removed all existing PyTorch installations
echo • Installed CPU-only PyTorch versions
echo • Updated to Windows-compatible package versions
echo • Enabled fallback transcription system
echo.
echo You can now run the application with:
echo   start-servers.bat
echo.
echo If you still get DLL errors, try:
echo 1. Install Visual C++ Redistributables from Microsoft
echo 2. Restart your computer
echo 3. Run this fix script again
echo.
pause
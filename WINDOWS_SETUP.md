# Windows Setup Guide for Face2Phrase

## 🚨 Windows-Specific PyTorch DLL Error Fix

The error you're encountering is a common Windows issue with PyTorch. Here's a complete solution:

## 🔧 Solution 1: Use CPU-Only PyTorch (Recommended for most users)

### Step 1: Delete your current virtual environment
```bash
# Navigate to your project directory
cd "C:\Users\Kshitiz Singhal\Downloads\my-project\face2phrase-New-project\backend"

# Remove the existing venv
rmdir /s venv
```

### Step 2: Create a new virtual environment
```bash
python -m venv venv
venv\Scripts\activate
```

### Step 3: Install CPU-only PyTorch first
```bash
# Install CPU-only PyTorch (no CUDA dependencies)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Step 4: Install other requirements
```bash
# Install remaining requirements
pip install fastapi==0.104.1
pip install uvicorn[standard]==0.24.0
pip install python-multipart==0.0.6
pip install aiofiles==23.2.1
pip install google-generativeai==0.3.1
pip install openai-whisper==20231117
pip install ffmpeg-python==0.2.0
pip install pydub==0.25.1
pip install pydantic==2.5.0
pip install python-dotenv==1.0.0
pip install sqlalchemy==2.0.23
pip install psycopg2-binary==2.9.9
pip install numpy==1.26.2
pip install pandas==2.1.3
pip install librosa==0.10.1
pip install scipy==1.11.4
pip install matplotlib==3.8.2
pip install bcrypt==4.1.2
pip install python-jose[cryptography]==3.3.0
pip install passlib[bcrypt]==1.7.4
pip install reportlab==4.0.7
```

## 🔧 Solution 2: Install Visual C++ Redistributables (Alternative)

If you prefer to keep CUDA support:

### Step 1: Install Visual C++ Redistributables
Download and install from Microsoft:
- [Microsoft Visual C++ Redistributable for Visual Studio 2015-2022](https://aka.ms/vs/17/release/vc_redist.x64.exe)

### Step 2: Install CUDA Toolkit (if you have NVIDIA GPU)
- Download [CUDA Toolkit 11.8](https://developer.nvidia.com/cuda-11-8-0-download-archive)
- Follow the installation wizard

### Step 3: Recreate virtual environment with CUDA PyTorch
```bash
rmdir /s venv
python -m venv venv
venv\Scripts\activate
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
# Then install other requirements as above
```

## 🚀 Complete Setup Commands (Recommended - CPU Only)

Here's the complete sequence of commands to run:

```bash
# 1. Navigate to backend directory
cd "C:\Users\Kshitiz Singhal\Downloads\my-project\face2phrase-New-project\backend"

# 2. Remove old environment
rmdir /s venv

# 3. Create new environment
python -m venv venv

# 4. Activate environment
venv\Scripts\activate

# 5. Upgrade pip
python -m pip install --upgrade pip

# 6. Install CPU-only PyTorch first
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# 7. Install all other requirements
pip install fastapi==0.104.1 uvicorn[standard]==0.24.0 python-multipart==0.0.6 aiofiles==23.2.1 google-generativeai==0.3.1 openai-whisper==20231117 ffmpeg-python==0.2.0 pydub==0.25.1 pydantic==2.5.0 python-dotenv==1.0.0 sqlalchemy==2.0.23 psycopg2-binary==2.9.9 numpy==1.26.2 pandas==2.1.3 librosa==0.10.1 scipy==1.11.4 matplotlib==3.8.2 bcrypt==4.1.2 "python-jose[cryptography]==3.3.0" "passlib[bcrypt]==1.7.4" reportlab==4.0.7

# 8. Test the installation
python -c "import torch; print('PyTorch version:', torch.__version__); print('CUDA available:', torch.cuda.is_available())"
```

## 🎯 Frontend Setup

### Step 1: Install Node.js
Download and install Node.js from: https://nodejs.org/en/download/

### Step 2: Install frontend dependencies
```bash
# Navigate to frontend directory
cd "C:\Users\Kshitiz Singhal\Downloads\my-project\face2phrase-New-project\frontend"

# Install dependencies
npm install
```

## ▶️ Running the Application

### Step 1: Start the Backend
```bash
# In backend directory with activated venv
cd "C:\Users\Kshitiz Singhal\Downloads\my-project\face2phrase-New-project\backend"
venv\Scripts\activate
python main.py
```

### Step 2: Start the Frontend (in a new terminal)
```bash
# In frontend directory
cd "C:\Users\Kshitiz Singhal\Downloads\my-project\face2phrase-New-project\frontend"
npm start
```

## 🔑 Demo Credentials
- **Username**: demo
- **Password**: demo123

## 🛠️ Troubleshooting

### If you still get DLL errors:
1. Restart your computer after installing Visual C++ Redistributables
2. Make sure you're using the CPU-only PyTorch version
3. Check that your Python version is 3.8-3.11 (PyTorch compatibility)

### If librosa fails to install:
```bash
# Install Microsoft Visual C++ Build Tools
# Or use conda instead:
conda install librosa -c conda-forge
```

### If ffmpeg-python fails:
```bash
# Download FFmpeg from https://ffmpeg.org/download.html
# Add FFmpeg to your system PATH
# Or install via conda:
conda install ffmpeg -c conda-forge
```

## 📋 System Requirements
- **Python**: 3.8-3.11
- **Node.js**: 16.x or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **OS**: Windows 10/11

## 🎉 Success Indicators
When everything is working correctly, you should see:
1. Backend starts with "🚀 Starting Face2Phrase - OPTIMIZED VERSION"
2. Frontend opens at http://localhost:3000
3. Login page appears with Face2Phrase branding
4. Demo credentials work successfully
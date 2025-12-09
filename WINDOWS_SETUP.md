# Face2Phrase - Windows Setup Guide

## 🚀 Quick Start (One-Click Setup)

**For the easiest setup, just run:**
```bash
run-project.bat
```

This will automatically:
- Check for Python and Node.js
- Create virtual environment
- Install all dependencies
- Start both backend and frontend servers

---

## 📋 Prerequisites

Before running the project, ensure you have:

### 1. Python 3.8+ 
- Download from: https://python.org
- **Important**: Check "Add Python to PATH" during installation
- Verify installation: `python --version`

### 2. Node.js 16+
- Download from: https://nodejs.org
- Verify installation: `node --version`

### 3. Git (Optional)
- Download from: https://git-scm.com
- Only needed if cloning from GitHub

---

## 🛠️ Manual Setup Instructions

If you prefer manual setup or the batch file doesn't work:

### Step 1: Clone the Repository
```bash
git clone https://github.com/Kshitizsinghal1303/face2phrase.git
cd face2phrase
```

### Step 2: Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate.bat

# Install dependencies (Windows-optimized)
pip install --upgrade pip
pip install -r requirements-windows.txt

# If above fails, try regular requirements
pip install -r requirements.txt

# Install CPU-only PyTorch for Windows compatibility
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Step 3: Frontend Setup
```bash
cd ..\frontend
npm install
```

### Step 4: Create Required Directories
```bash
cd ..\backend
mkdir uploads sessions reports
```

---

## 🏃‍♂️ Running the Application

### Option 1: Use Batch Files (Recommended)
```bash
# Full setup and run
run-project.bat

# Or just start servers (if already set up)
start-servers.bat
```

### Option 2: Manual Start
```bash
# Terminal 1 - Backend
cd backend
venv\Scripts\activate.bat
python main.py

# Terminal 2 - Frontend
cd frontend
npm start
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. "DLL initialization routine failed" Error
This is the error you encountered. Fixed by:
- Using CPU-only PyTorch version
- Windows-compatible requirements file
- Graceful error handling for missing dependencies

#### 2. "Python not found"
- Reinstall Python with "Add to PATH" checked
- Or manually add Python to your PATH environment variable

#### 3. "Node not found"
- Install Node.js from nodejs.org
- Restart command prompt after installation

#### 4. Port Already in Use
- Kill existing processes: `taskkill /f /im python.exe` and `taskkill /f /im node.exe`
- Or change ports in the configuration

#### 5. Virtual Environment Issues
```bash
# Delete and recreate
rmdir /s backend\venv
cd backend
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements-windows.txt
```

#### 6. Missing Visual C++ Redistributables
If you get DLL errors, install:
- Microsoft Visual C++ Redistributable (latest)
- Download from Microsoft's official website

---

## 🎯 Features Available

### Core Features (Always Available)
- ✅ Interview question management
- ✅ Video recording and playback
- ✅ Basic file handling
- ✅ Session management

### AI Features (Require API Keys)
- 🔑 AI-powered feedback (requires Google Gemini API key)
- 🔑 Advanced analysis features

### Advanced Features (Dependency-Based)
- 🎤 Speech-to-text transcription (requires Whisper)
- 📊 Speech analysis and visualization
- 📹 Facial expression analysis
- 🎭 Emotion detection

**Note**: The application will run even if some advanced features are unavailable due to missing dependencies.

---

## 🔑 Configuration

### Environment Variables
Create a `.env` file in the `backend` directory:
```env
# Google Gemini API Key (optional but recommended)
GEMINI_API_KEY=your_api_key_here

# Server Configuration
HOST=0.0.0.0
PORT=8000
```

### API Keys Setup
1. Get Google Gemini API key from: https://makersuite.google.com/app/apikey
2. Add it to your `.env` file or directly in `main.py`

---

## 📁 Project Structure
```
face2phrase/
├── backend/                 # Python FastAPI backend
│   ├── main.py             # Main server file
│   ├── requirements.txt    # Python dependencies
│   ├── requirements-windows.txt  # Windows-optimized dependencies
│   ├── speech_analyzer_simple.py
│   ├── video_analyzer_simple.py
│   └── venv/               # Virtual environment
├── frontend/               # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── run-project.bat         # One-click setup and run
├── start-servers.bat       # Quick server start
└── WINDOWS_SETUP.md       # This file
```

---

## 🚀 Deployment (Optional)

### Local Network Access
To access from other devices on your network:
1. Find your IP address: `ipconfig`
2. Update CORS settings in `main.py` if needed
3. Access via: `http://YOUR_IP:3000`

### Cloud Deployment
The application can be deployed to:
- Heroku
- Vercel (frontend) + Railway (backend)
- AWS/Azure/GCP
- Docker containers

---

## 📞 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Ensure all prerequisites are installed
3. Try the Windows-specific requirements file
4. Check the console output for specific error messages

The application is designed to be resilient - it will work even if some advanced features are unavailable due to missing dependencies.

---

## 🎉 Success!

If everything is working, you should see:
- Backend server running on port 8000
- Frontend application on port 3000
- No critical errors in the console
- Ability to create interview sessions and record videos

Enjoy using Face2Phrase! 🎬✨
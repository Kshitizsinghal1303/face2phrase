# 🎬 Face2Phrase - Windows Setup & Troubleshooting Guide

## 🚀 **QUICK START - One Command Setup**

```bash
# Clone the repository
git clone https://github.com/Kshitizsinghal1303/face2phrase.git
cd face2phrase

# Run the automated setup (Windows)
run-project.bat
```

**That's it!** The batch file will handle everything automatically.

---

## 🔧 **Fixed Issues**

### ✅ **Resolved: Windows DLL Error**
```
OSError: [WinError 1114] A dynamic link library (DLL) initialization routine failed. 
Error loading "...\torch\lib\c10.dll" or one of its dependencies.
```

**Solution implemented:**
- CPU-only PyTorch installation for Windows compatibility
- Graceful error handling and fallbacks
- Windows-specific requirements file
- Comprehensive dependency management

---

## 📋 **Prerequisites**

### **Required:**
1. **Python 3.8+** - [Download here](https://python.org)
   - ⚠️ **IMPORTANT**: Check "Add Python to PATH" during installation
2. **Node.js 16+** - [Download here](https://nodejs.org)

### **Optional (for full features):**
3. **Visual C++ Redistributables** - [Download here](https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist)
4. **Git** - [Download here](https://git-scm.com) (for cloning)

---

## 🛠️ **Setup Methods**

### **Method 1: Automated Setup (Recommended)**
```bash
# Download and run
run-project.bat
```

### **Method 2: Manual Setup**
```bash
# 1. Clone repository
git clone https://github.com/Kshitizsinghal1303/face2phrase.git
cd face2phrase

# 2. Backend setup
cd backend
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements-windows.txt

# 3. Frontend setup
cd ..\frontend
npm install

# 4. Start servers
cd ..
start-servers.bat
```

---

## 🏃‍♂️ **Running the Application**

### **Option 1: Batch Files**
```bash
# Full setup and run
run-project.bat

# Just start servers (if already set up)
start-servers.bat
```

### **Option 2: Manual Start**
```bash
# Terminal 1 - Backend
cd backend
venv\Scripts\activate.bat
python main.py

# Terminal 2 - Frontend  
cd frontend
npm start
```

### **Access Points:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

---

## 🔍 **Troubleshooting**

### **1. DLL Initialization Failed**
```bash
# Solution: Use CPU-only PyTorch
pip uninstall torch torchaudio
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### **2. Python Not Found**
- Reinstall Python with "Add to PATH" checked
- Or manually add to PATH: `C:\Python3X\` and `C:\Python3X\Scripts\`

### **3. Node Not Found**
- Install Node.js from nodejs.org
- Restart command prompt after installation

### **4. Port Already in Use**
```bash
# Kill existing processes
taskkill /f /im python.exe
taskkill /f /im node.exe
```

### **5. Virtual Environment Issues**
```bash
# Delete and recreate
rmdir /s backend\venv
cd backend
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements-windows.txt
```

### **6. Missing Dependencies**
```bash
# Test compatibility
python test_windows_compatibility.py

# Install missing packages
pip install -r requirements-windows.txt
```

---

## 🎯 **Feature Availability**

The application is designed to work even with missing dependencies:

### **✅ Always Available:**
- Interview question management
- Video recording and playback
- Session management
- Basic file operations

### **🔑 Requires API Key:**
- AI-powered question generation
- Intelligent feedback analysis

### **📦 Requires Dependencies:**
- Speech-to-text transcription (Whisper)
- Advanced speech analysis (librosa, scipy)
- Facial expression analysis (OpenCV, MediaPipe)
- Emotion detection (computer vision libraries)

### **Check Status:**
Visit http://localhost:8000/api/health to see which features are available.

---

## 📁 **Project Structure**
```
face2phrase/
├── backend/                    # Python FastAPI backend
│   ├── main.py                # Main server (Windows-compatible)
│   ├── requirements.txt       # Standard requirements
│   ├── requirements-windows.txt # Windows-optimized requirements
│   ├── speech_analyzer_simple.py
│   ├── video_analyzer_simple.py
│   └── venv/                  # Virtual environment
├── frontend/                  # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── run-project.bat           # One-click setup and run
├── start-servers.bat         # Quick server start
├── test_windows_compatibility.py # Compatibility test
├── WINDOWS_SETUP.md          # Detailed Windows guide
└── README_WINDOWS.md         # This file
```

---

## 🔧 **Configuration**

### **Environment Variables**
Create `backend\.env`:
```env
# Google Gemini API Key (optional but recommended)
GEMINI_API_KEY=your_api_key_here

# Server Configuration
HOST=0.0.0.0
PORT=8000
```

### **Get API Keys:**
1. **Google Gemini**: https://makersuite.google.com/app/apikey
2. Add to `.env` file or directly in `main.py`

---

## 🧪 **Testing**

### **Compatibility Test:**
```bash
python test_windows_compatibility.py
```

### **Health Check:**
```bash
# Visit in browser or curl
curl http://localhost:8000/api/health
```

### **Manual Test:**
1. Start servers: `start-servers.bat`
2. Open: http://localhost:3000
3. Create interview session
4. Record a test video
5. Check for errors in console

---

## 🚀 **Deployment Options**

### **Local Network Access:**
1. Find your IP: `ipconfig`
2. Access from other devices: `http://YOUR_IP:3000`

### **Cloud Deployment:**
- **Frontend**: Vercel, Netlify
- **Backend**: Railway, Heroku, AWS
- **Full Stack**: Docker containers

---

## 📞 **Support & Issues**

### **If you encounter problems:**

1. **Run the compatibility test:**
   ```bash
   python test_windows_compatibility.py
   ```

2. **Check the health endpoint:**
   ```bash
   curl http://localhost:8000/api/health
   ```

3. **Common solutions:**
   - Use `requirements-windows.txt` instead of `requirements.txt`
   - Install Visual C++ Redistributables
   - Use CPU-only PyTorch
   - Check Python and Node.js are in PATH

4. **The application is resilient** - it will work even if some advanced features are unavailable.

---

## ✨ **What's New in v2.0**

### **🔧 Windows Compatibility:**
- Fixed DLL initialization errors
- CPU-only PyTorch support
- Graceful dependency handling
- Windows-specific requirements

### **🚀 Setup Automation:**
- One-click batch file setup
- Automated dependency installation
- Comprehensive error handling
- Clear troubleshooting guidance

### **📊 Enhanced Analysis:**
- Advanced speech processing
- Facial expression analysis
- Interactive visualizations
- Emotion detection

### **🎯 Improved Reliability:**
- Works with partial dependencies
- Better error messages
- Health monitoring endpoints
- Comprehensive logging

---

## 🎉 **Success Indicators**

You'll know everything is working when:
- ✅ Backend starts without DLL errors
- ✅ Frontend compiles successfully
- ✅ http://localhost:3000 loads the interface
- ✅ http://localhost:8000/api/health shows system status
- ✅ You can create interview sessions
- ✅ Video recording works

**Enjoy using Face2Phrase! 🎬✨**
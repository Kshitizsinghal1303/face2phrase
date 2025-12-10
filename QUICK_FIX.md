# 🚨 QUICK FIX for Windows DLL Error

## The Problem
You're getting a PyTorch DLL error because Windows needs CPU-only PyTorch instead of the CUDA version.

## ⚡ FASTEST SOLUTION (Copy & Paste These Commands)

Open Command Prompt as Administrator and run these commands one by one:

```bash
# 1. Go to your project backend folder
cd "C:\Users\Kshitiz Singhal\Downloads\my-project\face2phrase-New-project\backend"

# 2. Delete the problematic virtual environment
rmdir /s venv

# 3. Create a fresh virtual environment
python -m venv venv

# 4. Activate it
venv\Scripts\activate

# 5. Install CPU-only PyTorch FIRST (this fixes the DLL error)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# 6. Install everything else
pip install fastapi uvicorn[standard] python-multipart aiofiles google-generativeai openai-whisper ffmpeg-python pydub pydantic python-dotenv numpy pandas librosa scipy matplotlib bcrypt "python-jose[cryptography]" "passlib[bcrypt]" reportlab sqlalchemy

# 7. Test if it works
python -c "import torch; print('Success! PyTorch version:', torch.__version__)"
```

## ▶️ Run the Application

```bash
# Start backend (in the backend folder with venv activated)
python main.py
```

In a new terminal:
```bash
# Start frontend
cd "C:\Users\Kshitiz Singhal\Downloads\my-project\face2phrase-New-project\frontend"
npm install
npm start
```

## 🔑 Login Credentials
- Username: `demo`
- Password: `demo123`

## 🎯 What This Fixes
- ✅ Removes CUDA dependencies that cause DLL errors on Windows
- ✅ Uses CPU-only PyTorch (works on all Windows machines)
- ✅ Installs all required packages in the correct order
- ✅ Creates a clean virtual environment

## 🆘 If You Still Have Issues

1. **Make sure Python 3.8-3.11 is installed** (not 3.12+)
2. **Run Command Prompt as Administrator**
3. **Restart your computer** after the installation
4. **Use the automated script**: Double-click `setup-windows.bat` in the project folder

The application will work with CPU-only PyTorch - you don't need a GPU for this project!
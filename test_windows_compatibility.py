#!/usr/bin/env python3
"""
Windows Compatibility Test Script for Face2Phrase
Tests all the fixes implemented for Windows DLL issues
"""

import sys
import os
import importlib.util

def test_import(module_name, description=""):
    """Test importing a module with error handling"""
    try:
        if module_name.endswith('.py'):
            # Import from file
            spec = importlib.util.spec_from_file_location("test_module", module_name)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
        else:
            # Import by name
            __import__(module_name)
        print(f"✅ {description or module_name}: SUCCESS")
        return True
    except ImportError as e:
        print(f"⚠️  {description or module_name}: MISSING - {e}")
        return False
    except Exception as e:
        print(f"❌ {description or module_name}: ERROR - {e}")
        return False

def main():
    print("=" * 60)
    print("Face2Phrase Windows Compatibility Test")
    print("=" * 60)
    print(f"Python Version: {sys.version}")
    print(f"Platform: {sys.platform}")
    print()
    
    # Test core dependencies
    print("Testing Core Dependencies:")
    print("-" * 30)
    core_deps = [
        ("fastapi", "FastAPI Web Framework"),
        ("uvicorn", "ASGI Server"),
        ("pydantic", "Data Validation"),
        ("aiofiles", "Async File Operations"),
    ]
    
    core_success = 0
    for module, desc in core_deps:
        if test_import(module, desc):
            core_success += 1
    
    print()
    
    # Test AI dependencies
    print("Testing AI Dependencies:")
    print("-" * 30)
    ai_deps = [
        ("google.generativeai", "Google Gemini AI"),
        ("whisper", "OpenAI Whisper"),
        ("torch", "PyTorch"),
        ("torchaudio", "PyTorch Audio"),
    ]
    
    ai_success = 0
    for module, desc in ai_deps:
        if test_import(module, desc):
            ai_success += 1
    
    print()
    
    # Test analysis dependencies
    print("Testing Analysis Dependencies:")
    print("-" * 30)
    analysis_deps = [
        ("librosa", "Audio Analysis"),
        ("scipy", "Scientific Computing"),
        ("matplotlib", "Plotting"),
        ("plotly", "Interactive Plots"),
        ("cv2", "OpenCV Computer Vision"),
        ("mediapipe", "MediaPipe"),
        ("PIL", "Pillow Image Processing"),
    ]
    
    analysis_success = 0
    for module, desc in analysis_deps:
        if test_import(module, desc):
            analysis_success += 1
    
    print()
    
    # Test main application
    print("Testing Main Application:")
    print("-" * 30)
    
    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    if os.path.exists(backend_dir):
        os.chdir(backend_dir)
        main_success = test_import("main.py", "Main Application")
    else:
        print("❌ Backend directory not found")
        main_success = False
    
    print()
    
    # Summary
    print("=" * 60)
    print("COMPATIBILITY TEST SUMMARY")
    print("=" * 60)
    print(f"Core Dependencies: {core_success}/{len(core_deps)} ({'✅ GOOD' if core_success == len(core_deps) else '⚠️ PARTIAL'})")
    print(f"AI Dependencies: {ai_success}/{len(ai_deps)} ({'✅ GOOD' if ai_success >= 2 else '⚠️ LIMITED'})")
    print(f"Analysis Dependencies: {analysis_success}/{len(analysis_deps)} ({'✅ GOOD' if analysis_success >= 4 else '⚠️ LIMITED'})")
    print(f"Main Application: {'✅ WORKING' if main_success else '❌ FAILED'}")
    
    print()
    print("RECOMMENDATIONS:")
    print("-" * 20)
    
    if core_success < len(core_deps):
        print("• Install core dependencies: pip install fastapi uvicorn pydantic aiofiles")
    
    if ai_success < 2:
        print("• For Windows compatibility, install CPU-only PyTorch:")
        print("  pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu")
        print("• Install Whisper: pip install openai-whisper")
    
    if analysis_success < 4:
        print("• Install analysis dependencies from requirements-windows.txt")
        print("• Some advanced features may be disabled but core functionality will work")
    
    if not main_success:
        print("• Check the error messages above for specific issues")
        print("• Ensure you're running from the correct directory")
    
    print()
    print("The application is designed to work even with missing optional dependencies!")
    print("Core interview functionality will be available regardless.")
    
    return main_success and core_success >= 3

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
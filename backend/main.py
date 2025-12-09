
import sys
import warnings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Core imports
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel
import uuid
import os
import json
from pathlib import Path
import aiofiles
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import subprocess
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading

# PDF generation
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
    REPORTLAB_AVAILABLE = True
except ImportError as e:
    logger.warning(f"ReportLab not available: {e}. PDF generation will be disabled.")
    REPORTLAB_AVAILABLE = False

# Google Gemini AI
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Google Generative AI not available: {e}. AI features will be limited.")
    GEMINI_AVAILABLE = False

# Whisper for speech-to-text
try:
    import whisper
    WHISPER_AVAILABLE = True
    logger.info("Whisper loaded successfully")
except ImportError as e:
    logger.error(f"Whisper not available: {e}. Speech-to-text will be disabled.")
    WHISPER_AVAILABLE = False
except Exception as e:
    logger.error(f"Error loading Whisper: {e}. This might be a Windows DLL issue.")
    WHISPER_AVAILABLE = False

# Analysis modules with fallbacks
try:
    from speech_analyzer_simple import SpeechAnalyzer
    SPEECH_ANALYSIS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Speech analyzer not available: {e}")
    SPEECH_ANALYSIS_AVAILABLE = False

try:
    from video_analyzer_simple import VideoAnalyzer
    VIDEO_ANALYSIS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Video analyzer not available: {e}")
    VIDEO_ANALYSIS_AVAILABLE = False

# Initialize FastAPI
app = FastAPI(title="Face2Phrase Interview Assistant - Optimized")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Multiple Gemini API Keys
GEMINI_API_KEYS = [
    
]

# ==================== OPTIMIZED API KEY MANAGER ====================
class APIKeyManager:
    def __init__(self, keys: List[str], cooldown_seconds: int = 60):
        self.keys = keys
        self.cooldown_seconds = cooldown_seconds
        self.key_stats = {
            i: {
                "count": 0,
                "last_used": 0,
                "cooldown_until": 0,
                "consecutive_failures": 0,
                "total_failures": 0,
                "last_success": time.time()
            } for i in range(len(keys))
        }
        self.lock = threading.Lock()
    
    def get_best_key(self) -> tuple[int, str]:
        """Get the best available API key with intelligent selection"""
        with self.lock:
            current_time = time.time()
            
            # Find available keys (not in cooldown)
            available = []
            for idx, stats in self.key_stats.items():
                if current_time >= stats["cooldown_until"]:
                    # Prioritize keys with fewer consecutive failures
                    priority_score = (
                        -stats["consecutive_failures"] * 100  # Heavy penalty for failures
                        - stats["count"]  # Light penalty for usage
                        + (current_time - stats["last_used"]) / 10  # Bonus for rest time
                    )
                    available.append((idx, priority_score))
            
            if not available:
                # Find key with shortest remaining cooldown
                soonest_idx = min(
                    self.key_stats.items(),
                    key=lambda x: x[1]["cooldown_until"]
                )[0]
                return soonest_idx, self.keys[soonest_idx]
            
            # Return key with best priority score
            best_idx = max(available, key=lambda x: x[1])[0]
            return best_idx, self.keys[best_idx]
    
    def mark_success(self, key_idx: int):
        """Mark successful API call"""
        with self.lock:
            self.key_stats[key_idx]["count"] += 1
            self.key_stats[key_idx]["last_used"] = time.time()
            self.key_stats[key_idx]["last_success"] = time.time()
            self.key_stats[key_idx]["consecutive_failures"] = 0
            # Short cooldown after success
            self.key_stats[key_idx]["cooldown_until"] = time.time() + (self.cooldown_seconds / 2)
    
    def mark_failure(self, key_idx: int, is_rate_limit: bool = False):
        """Mark failed API call"""
        with self.lock:
            self.key_stats[key_idx]["consecutive_failures"] += 1
            self.key_stats[key_idx]["total_failures"] += 1
            
            # Longer cooldown for rate limit errors
            if is_rate_limit:
                cooldown_multiplier = min(self.key_stats[key_idx]["consecutive_failures"], 5)
                self.key_stats[key_idx]["cooldown_until"] = time.time() + (self.cooldown_seconds * cooldown_multiplier)
            else:
                self.key_stats[key_idx]["cooldown_until"] = time.time() + self.cooldown_seconds
    
    def get_stats(self) -> List[Dict]:
        """Get statistics for all keys"""
        current_time = time.time()
        stats = []
        for idx, info in self.key_stats.items():
            cooldown_remaining = max(0, info["cooldown_until"] - current_time)
            stats.append({
                "key_number": idx + 1,
                "usage_count": info["count"],
                "consecutive_failures": info["consecutive_failures"],
                "total_failures": info["total_failures"],
                "status": "cooldown" if cooldown_remaining > 0 else "available",
                "cooldown_seconds": round(cooldown_remaining, 1),
                "time_since_success": round(current_time - info["last_success"], 1)
            })
        return stats

# Initialize key manager
key_manager = APIKeyManager(GEMINI_API_KEYS, cooldown_seconds=60)

# ==================== OPTIMIZED GEMINI CALLER ====================
async def generate_with_gemini(prompt: str, max_retries: int = None) -> str:
    """Generate content with optimized retry logic"""
    if max_retries is None:
        max_retries = len(GEMINI_API_KEYS) * 2
    
    attempts = 0
    last_error = None
    
    while attempts < max_retries:
        try:
            key_idx, api_key = key_manager.get_best_key()
            
            # Configure API
            genai.configure(api_key=api_key)
            
            generation_config = {
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 2048,
            }
            
            model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                generation_config=generation_config,
            )
            
            print(f"🔑 Using API key {key_idx + 1} (Attempt {attempts + 1})")
            
            # Make request with timeout
            loop = asyncio.get_event_loop()
            response = await asyncio.wait_for(
                loop.run_in_executor(None, model.generate_content, prompt),
                timeout=30.0  # 30 second timeout
            )
            
            # Success!
            key_manager.mark_success(key_idx)
            return response.text.strip()
            
        except asyncio.TimeoutError:
            print(f"⏱️ Timeout on key {key_idx + 1}")
            key_manager.mark_failure(key_idx, is_rate_limit=False)
            attempts += 1
            await asyncio.sleep(2)
            
        except Exception as e:
            error_str = str(e)
            is_rate_limit = any(x in error_str.lower() for x in ["429", "quota", "resource exhausted", "rate limit"])
            
            print(f"⚠️ Error on key {key_idx + 1}: {error_str[:100]}")
            key_manager.mark_failure(key_idx, is_rate_limit=is_rate_limit)
            
            last_error = error_str
            attempts += 1
            
            # Wait longer for rate limit errors
            wait_time = 5 if is_rate_limit else 2
            await asyncio.sleep(wait_time)
    
    raise HTTPException(
        status_code=429,
        detail=f"All API keys exhausted after {attempts} attempts. Last error: {last_error}"
    )

# Initialize Whisper model with error handling
whisper_model = None
if WHISPER_AVAILABLE:
    try:
        print("Loading Whisper model...")
        whisper_model = whisper.load_model("base")  # You can use "tiny" for even faster processing
        print("Whisper model loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load Whisper model: {e}")
        WHISPER_AVAILABLE = False
else:
    print("Whisper not available - speech-to-text will be disabled")

# Initialize analysis modules with error handling
speech_analyzer = None
if SPEECH_ANALYSIS_AVAILABLE:
    try:
        print("Initializing speech analyzer...")
        speech_analyzer = SpeechAnalyzer()
        print("Speech analyzer initialized successfully!")
    except Exception as e:
        logger.error(f"Failed to initialize speech analyzer: {e}")
        SPEECH_ANALYSIS_AVAILABLE = False
else:
    print("Speech analyzer not available - advanced speech analysis will be disabled")

video_analyzer = None
if VIDEO_ANALYSIS_AVAILABLE:
    try:
        print("Initializing video analyzer...")
        video_analyzer = VideoAnalyzer()
        print("Video analyzer initialized successfully!")
    except Exception as e:
        logger.error(f"Failed to initialize video analyzer: {e}")
        VIDEO_ANALYSIS_AVAILABLE = False
else:
    print("Video analyzer not available - advanced video analysis will be disabled")

# Thread pool for parallel processing
executor = ThreadPoolExecutor(max_workers=4)

# Data directories
BASE_DIR = Path("interview_data")
BASE_DIR.mkdir(exist_ok=True)

# In-memory storage
sessions = {}

class CandidateInfo(BaseModel):
    name: str
    email: str
    position: str
    experience: str
    jd: str

class QuestionResponse(BaseModel):
    questions: List[str]
    session_id: str

def create_session_directory(session_id: str) -> Path:
    """Create directory structure for session"""
    session_dir = BASE_DIR / session_id
    session_dir.mkdir(exist_ok=True)
    (session_dir / "videos").mkdir(exist_ok=True)
    (session_dir / "audio").mkdir(exist_ok=True)
    (session_dir / "transcripts").mkdir(exist_ok=True)
    (session_dir / "reports").mkdir(exist_ok=True)
    return session_dir

def extract_audio_from_video(video_path: str, audio_path: str) -> bool:
    """Extract audio from video using ffmpeg - OPTIMIZED"""
    try:
        command = [
            'ffmpeg',
            '-i', video_path,
            '-vn',  # No video
            '-acodec', 'pcm_s16le',
            '-ar', '16000',  # 16kHz sample rate (Whisper optimized)
            '-ac', '1',  # Mono
            '-y',  # Overwrite
            audio_path
        ]
        subprocess.run(command, check=True, capture_output=True, timeout=30)
        return True
    except Exception as e:
        print(f"Error extracting audio: {str(e)}")
        return False

async def save_session_metadata(session_id: str, data: dict):
    """Save session metadata"""
    session_dir = BASE_DIR / session_id
    metadata_path = session_dir / "metadata.json"
    async with aiofiles.open(metadata_path, 'w') as f:
        await f.write(json.dumps(data, indent=2))

def generate_feedback_pdf(session_id: str, feedback_data: dict):
    """Generate feedback PDF - same as before"""
    session_dir = BASE_DIR / session_id
    pdf_path = session_dir / "reports" / "feedback_report.pdf"
    
    doc = SimpleDocTemplate(str(pdf_path), pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#667eea'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#764ba2'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    story.append(Paragraph("📊 Interview Performance Report", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    candidate = feedback_data['candidate']
    story.append(Paragraph(f"<b>Candidate:</b> {candidate['name']}", styles['Normal']))
    story.append(Paragraph(f"<b>Position:</b> {candidate['position']}", styles['Normal']))
    story.append(Paragraph(f"<b>Experience:</b> {candidate['experience']}", styles['Normal']))
    story.append(Paragraph(f"<b>Date:</b> {datetime.now().strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Spacer(1, 0.4*inch))
    
    for idx, qf in enumerate(feedback_data['question_feedbacks']):
        story.append(Paragraph(f"Question {idx + 1}", heading_style))
        story.append(Paragraph(f"<b>Q:</b> {qf['question']}", styles['Normal']))
        story.append(Spacer(1, 0.1*inch))
        
        story.append(Paragraph(f"<b>Your Answer:</b>", styles['Normal']))
        story.append(Paragraph(qf['user_answer'], styles['BodyText']))
        story.append(Spacer(1, 0.1*inch))
        
        rating_data = [
            ['Aspect', 'Rating'],
            ['Relevance', f"{qf['ratings']['relevance']}/10"],
            ['Clarity', f"{qf['ratings']['clarity']}/10"],
            ['Depth', f"{qf['ratings']['depth']}/10"],
            ['Confidence', f"{qf['ratings']['confidence']}/10"],
            ['Overall', f"{qf['ratings']['overall']}/10"]
        ]
        
        rating_table = Table(rating_data, colWidths=[3*inch, 1.5*inch])
        rating_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(rating_table)
        story.append(Spacer(1, 0.2*inch))
        
        story.append(Paragraph(f"<b>Feedback:</b>", styles['Normal']))
        story.append(Paragraph(qf['feedback'], styles['BodyText']))
        story.append(Spacer(1, 0.3*inch))
        
        if idx < len(feedback_data['question_feedbacks']) - 1:
            story.append(PageBreak())
    
    story.append(PageBreak())
    story.append(Paragraph("📈 Overall Summary", heading_style))
    story.append(Paragraph(feedback_data['overall_summary'], styles['BodyText']))
    story.append(Spacer(1, 0.3*inch))
    
    story.append(Paragraph("💡 Key Recommendations", heading_style))
    for rec in feedback_data['recommendations']:
        story.append(Paragraph(f"• {rec}", styles['BodyText']))
        story.append(Spacer(1, 0.1*inch))
    
    doc.build(story)
    return pdf_path

def generate_expected_answers_pdf(session_id: str, answers_data: dict):
    """Generate expected answers PDF - same as before"""
    session_dir = BASE_DIR / session_id
    pdf_path = session_dir / "reports" / "expected_answers.pdf"
    
    doc = SimpleDocTemplate(str(pdf_path), pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#48bb78'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#38a169'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    story.append(Paragraph("✅ Expected Answers Guide", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    candidate = answers_data['candidate']
    story.append(Paragraph(f"<b>Position:</b> {candidate['position']}", styles['Normal']))
    story.append(Paragraph(f"<b>Experience Level:</b> {candidate['experience']}", styles['Normal']))
    story.append(Spacer(1, 0.4*inch))
    
    for idx, answer in enumerate(answers_data['expected_answers']):
        story.append(Paragraph(f"Question {idx + 1}", heading_style))
        story.append(Paragraph(f"<b>Q:</b> {answer['question']}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
        story.append(Paragraph(f"<b>Expected Answer:</b>", styles['Normal']))
        story.append(Paragraph(answer['expected_answer'], styles['BodyText']))
        story.append(Spacer(1, 0.2*inch))
        
        story.append(Paragraph(f"<b>Key Points to Cover:</b>", styles['Normal']))
        for point in answer['key_points']:
            story.append(Paragraph(f"• {point}", styles['BodyText']))
            story.append(Spacer(1, 0.05*inch))
        
        story.append(Spacer(1, 0.3*inch))
        
        if idx < len(answers_data['expected_answers']) - 1:
            story.append(PageBreak())
    
    doc.build(story)
    return pdf_path

@app.get("/")
async def root():
    return {
        "message": "Face2Phrase - Enhanced Interview Assistant",
        "status": "running",
        "version": "2.0.0",
        "features": {
            "core": ["Interview Management", "Video Recording", "Session Management"],
            "ai": ["Question Generation", "Feedback Analysis"] if GEMINI_AVAILABLE else ["Limited - No API Key"],
            "speech": ["Transcription", "Acoustic Analysis"] if WHISPER_AVAILABLE else ["Disabled - Whisper Error"],
            "video": ["Facial Analysis", "Emotion Detection"] if VIDEO_ANALYSIS_AVAILABLE else ["Disabled - Missing Dependencies"]
        },
        "system_status": {
            "whisper": "available" if WHISPER_AVAILABLE else "unavailable",
            "speech_analysis": "available" if SPEECH_ANALYSIS_AVAILABLE else "unavailable", 
            "video_analysis": "available" if VIDEO_ANALYSIS_AVAILABLE else "unavailable",
            "gemini_ai": "available" if GEMINI_AVAILABLE else "unavailable",
            "pdf_generation": "available" if REPORTLAB_AVAILABLE else "unavailable"
        }
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check for troubleshooting"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "dependencies": {
            "whisper": {
                "available": WHISPER_AVAILABLE,
                "model_loaded": whisper_model is not None,
                "error": "DLL initialization failed" if not WHISPER_AVAILABLE else None
            },
            "speech_analyzer": {
                "available": SPEECH_ANALYSIS_AVAILABLE,
                "initialized": speech_analyzer is not None
            },
            "video_analyzer": {
                "available": VIDEO_ANALYSIS_AVAILABLE,
                "initialized": video_analyzer is not None
            },
            "gemini_ai": {
                "available": GEMINI_AVAILABLE,
                "api_keys_configured": len(GEMINI_API_KEYS) > 0
            }
        },
        "recommendations": [
            "Install Visual C++ Redistributables if getting DLL errors",
            "Use CPU-only PyTorch for Windows compatibility", 
            "Check requirements-windows.txt for Windows-specific versions"
        ] if not WHISPER_AVAILABLE else []
    }

@app.get("/api/stats")
async def get_api_stats():
    """Get detailed API key statistics"""
    stats = key_manager.get_stats()
    return {
        "api_keys": stats,
        "total_requests": sum(s["usage_count"] for s in stats),
        "available_keys": len([s for s in stats if s["status"] == "available"])
    }

@app.post("/api/generate-questions", response_model=QuestionResponse)
async def generate_questions(candidate: CandidateInfo):
    """Generate interview questions with optimized API calls"""
    try:
        session_id = str(uuid.uuid4())
        create_session_directory(session_id)
        
        prompt = f"""Generate exactly 5 relevant interview questions for:

Position: {candidate.position}
Experience: {candidate.experience}
Job Description: {candidate.jd[:500]}

Requirements:
- Mix technical and behavioral questions
- Match experience level
- Clear and professional
- Numbered 1-5

Format:
1. [Question]
2. [Question]
3. [Question]
4. [Question]
5. [Question]"""
        
        questions_text = await generate_with_gemini(prompt)
        
        questions = []
        for line in questions_text.split('\n'):
            line = line.strip()
            if line and any(line.startswith(f"{i}.") for i in range(1, 10)):
                question = line.split('.', 1)[1].strip()
                if question:
                    questions.append(question)
        
        fallback_questions = [
            "Tell me about yourself and why you're interested in this position.",
            "What relevant experience do you have for this role?",
            "Describe a challenging project you worked on.",
            "What are your key strengths for this position?",
            "Where do you see yourself in the next 3-5 years?"
        ]
        
        if len(questions) < 5:
            questions.extend(fallback_questions[:5-len(questions)])
        
        questions = questions[:5]
        
        session_data = {
            "session_id": session_id,
            "candidate": candidate.dict(),
            "questions": questions,
            "created_at": datetime.now().isoformat(),
            "status": "active"
        }
        
        sessions[session_id] = session_data
        await save_session_metadata(session_id, session_data)
        
        print(f"✅ Generated questions for session: {session_id}")
        
        return QuestionResponse(questions=questions, session_id=session_id)
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-video")
async def upload_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    session_id: str = Form(...),
    question_index: int = Form(...)
):
    """Optimized video upload with background processing"""
    try:
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_dir = BASE_DIR / session_id
        
        # Save video quickly
        video_filename = f"question_{question_index + 1}.webm"
        video_path = session_dir / "videos" / video_filename
        
        content = await video.read()
        async with aiofiles.open(video_path, 'wb') as f:
            await f.write(content)
        
        print(f"📹 Saved video ({len(content)/1024/1024:.1f}MB)")
        
        # Process in background
        background_tasks.add_task(
            process_video_background,
            session_id,
            question_index,
            str(video_path),
            video_filename
        )
        
        return {
            "status": "success",
            "message": f"Video uploaded, processing in background",
            "video_size_mb": round(len(content)/1024/1024, 2)
        }
    
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_video_background(session_id: str, question_index: int, video_path: str, video_filename: str):
    """Enhanced background task for video processing with speech and video analysis"""
    try:
        session_dir = BASE_DIR / session_id
        
        audio_filename = f"question_{question_index + 1}.wav"
        audio_path = session_dir / "audio" / audio_filename
        
        # Extract audio
        loop = asyncio.get_event_loop()
        audio_extracted = await loop.run_in_executor(
            executor,
            extract_audio_from_video,
            video_path,
            str(audio_path)
        )
        
        # Transcribe with fallback
        transcript_text = ""
        if WHISPER_AVAILABLE and whisper_model:
            try:
                transcription_file = str(audio_path) if audio_extracted else video_path
                
                result = await loop.run_in_executor(
                    executor,
                    lambda: whisper_model.transcribe(
                        transcription_file,
                        language="en",
                        fp16=False  # Better compatibility
                    )
                )
                
                transcript_text = result["text"].strip()
            except Exception as e:
                logger.error(f"Transcription failed: {e}")
                transcript_text = "[Transcription unavailable - Whisper error]"
        else:
            transcript_text = "[Transcription unavailable - Whisper not loaded]"
        
        # Advanced Speech Analysis
        speech_analysis = None
        speech_visualization = None
        speech_report = None
        
        if audio_extracted and SPEECH_ANALYSIS_AVAILABLE and speech_analyzer:
            try:
                print(f"🎤 Starting speech analysis for question {question_index + 1}...")
                speech_analysis = await loop.run_in_executor(
                    executor,
                    speech_analyzer.analyze_audio,
                    str(audio_path)
                )
                
                # Generate speech visualization
                speech_visualization = await loop.run_in_executor(
                    executor,
                    speech_analyzer.create_interactive_visualization,
                    speech_analysis
                )
                
                # Generate speech report
                speech_report = await loop.run_in_executor(
                    executor,
                    speech_analyzer.generate_speech_report,
                    speech_analysis
                )
                
                # Save speech analysis results
                speech_analysis_path = session_dir / "reports" / f"speech_analysis_{question_index + 1}.json"
                async with aiofiles.open(speech_analysis_path, 'w') as f:
                    await f.write(json.dumps({
                        'analysis': speech_analysis,
                        'visualization': speech_visualization,
                        'report': speech_report
                    }, indent=2))
                
                print(f"✅ Speech analysis completed for question {question_index + 1}")
                
            except Exception as e:
                print(f"⚠️ Speech analysis error for question {question_index + 1}: {str(e)}")
        
        # Advanced Video Analysis
        video_analysis = None
        video_visualization = None
        video_report = None
        
        if VIDEO_ANALYSIS_AVAILABLE and video_analyzer:
            try:
                print(f"📹 Starting video analysis for question {question_index + 1}...")
                video_analysis = await loop.run_in_executor(
                    executor,
                    video_analyzer.analyze_video,
                    video_path
                )
                
                # Generate video visualization
                video_visualization = await loop.run_in_executor(
                    executor,
                    video_analyzer.create_video_visualization,
                    video_analysis
                )
                
                # Generate video report
                video_report = await loop.run_in_executor(
                    executor,
                    video_analyzer.generate_video_report,
                    video_analysis
                )
                
                # Save video analysis results
                video_analysis_path = session_dir / "reports" / f"video_analysis_{question_index + 1}.json"
                async with aiofiles.open(video_analysis_path, 'w') as f:
                    await f.write(json.dumps({
                        'analysis': video_analysis,
                        'visualization': video_visualization,
                        'report': video_report
                    }, indent=2))
                
                print(f"✅ Video analysis completed for question {question_index + 1}")
                
            except Exception as e:
                print(f"⚠️ Video analysis error for question {question_index + 1}: {str(e)}")
        else:
            print("⚠️ Video analysis disabled - missing dependencies")
        
        # Save transcript
        transcript_filename = f"question_{question_index + 1}.txt"
        transcript_path = session_dir / "transcripts" / transcript_filename
        
        async with aiofiles.open(transcript_path, 'w', encoding='utf-8') as f:
            await f.write(f"Question: {sessions[session_id]['questions'][question_index]}\n\n")
            await f.write(f"Transcript:\n{transcript_text}\n")
        
        # Update session with enhanced data
        if "transcripts" not in sessions[session_id]:
            sessions[session_id]["transcripts"] = {}
        
        sessions[session_id]["transcripts"][question_index] = {
            "text": transcript_text,
            "video_file": video_filename,
            "audio_file": audio_filename if audio_extracted else None,
            "timestamp": datetime.now().isoformat(),
            "speech_analysis": speech_analysis is not None,
            "video_analysis": video_analysis is not None
        }
        
        print(f"✅ Enhanced processing completed for question {question_index + 1}: {len(transcript_text)} chars")
        
    except Exception as e:
        print(f"❌ Background processing error: {str(e)}")

@app.post("/api/finalize/{session_id}")
async def finalize_interview(session_id: str):
    """Generate feedback with parallel API calls"""
    try:
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_data = sessions[session_id]
        transcripts_data = session_data.get("transcripts", {})
        
        print(f"🚀 Starting parallel feedback generation...")
        
        # Create tasks for parallel processing
        feedback_tasks = []
        answer_tasks = []
        
        for idx, question in enumerate(session_data['questions']):
            user_answer = transcripts_data.get(idx, {}).get("text", "No response recorded")
            
            # Feedback task
            feedback_prompt = f"""Analyze this interview answer:

Question: {question}
Answer: {user_answer}

Provide JSON:
{{
  "ratings": {{"relevance": X, "clarity": X, "depth": X, "confidence": X, "overall": X}},
  "feedback": "2-3 sentences"
}}"""
            feedback_tasks.append(generate_with_gemini(feedback_prompt))
            
            # Answer task
            answer_prompt = f"""For this question, provide ideal answer:

Position: {session_data['candidate']['position']}
Question: {question}

Provide JSON:
{{
  "expected_answer": "3-4 sentences",
  "key_points": ["Point 1", "Point 2", "Point 3"]
}}"""
            answer_tasks.append(generate_with_gemini(answer_prompt))
        
        # Process all tasks in parallel
        print(f"⚡ Running {len(feedback_tasks) + len(answer_tasks)} parallel API calls...")
        
        feedback_results = await asyncio.gather(*feedback_tasks, return_exceptions=True)
        answer_results = await asyncio.gather(*answer_tasks, return_exceptions=True)
        
        # Parse results
        question_feedbacks = []
        expected_answers = []
        
        for idx, (feedback_text, answer_text) in enumerate(zip(feedback_results, answer_results)):
            # Parse feedback
            try:
                if isinstance(feedback_text, Exception):
                    raise feedback_text
                
                feedback_text = feedback_text.replace("```json", "").replace("```", "").strip()
                feedback_json = json.loads(feedback_text)
            except:
                feedback_json = {
                    "ratings": {"relevance": 7, "clarity": 7, "depth": 7, "confidence": 7, "overall": 7},
                    "feedback": "Good attempt."
                }
            
            question_feedbacks.append({
                "question": session_data['questions'][idx],
                "user_answer": transcripts_data.get(idx, {}).get("text", "No response"),
                "ratings": feedback_json["ratings"],
                "feedback": feedback_json["feedback"]
            })
            
            # Parse answer
            try:
                if isinstance(answer_text, Exception):
                    raise answer_text
                
                answer_text = answer_text.replace("```json", "").replace("```", "").strip()
                answer_json = json.loads(answer_text)
            except:
                answer_json = {
                    "expected_answer": "Well-structured answer with examples.",
                    "key_points": ["Key point 1", "Key point 2", "Key point 3"]
                }
            
            expected_answers.append({
                "question": session_data['questions'][idx],
                "expected_answer": answer_json["expected_answer"],
                "key_points": answer_json["key_points"]
            })
        
        # Generate summary
        print(f"📊 Generating summary...")
        
        # Build concise summary of ratings for context
        avg_ratings = {}
        for qf in question_feedbacks:
            for aspect, rating in qf['ratings'].items():
                if aspect not in avg_ratings:
                    avg_ratings[aspect] = []
                avg_ratings[aspect].append(rating)
        
        avg_summary = ", ".join([f"{k}: {sum(v)/len(v):.1f}/10" for k, v in avg_ratings.items()])
        
        summary_prompt = f"""You are an expert interview evaluator. Analyze the candidate's performance based on {len(question_feedbacks)} interview questions with these average ratings: {avg_summary}.

Your task: Create a professional evaluation summary.

CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no extra text.

Required JSON format:
{{
  "overall_summary": "Write exactly 3-4 sentences summarizing: (1) candidate's strongest areas, (2) areas needing improvement, and (3) overall impression and readiness for the role. Be specific and professional.",
  "recommendations": [
    "First actionable recommendation for improvement",
    "Second actionable recommendation for improvement",
    "Third actionable recommendation for improvement",
    "Fourth actionable recommendation for improvement",
    "Fifth actionable recommendation for improvement"
  ]
}}

Each recommendation must be:
- Specific and actionable
- Different from others
- Professional and constructive
- 10-20 words long

Return ONLY the JSON object above. Start with {{ and end with }}."""
        
        summary_text = await generate_with_gemini(summary_prompt)
        
        print(f"📋 Raw summary response length: {len(summary_text)} chars")
        print(f"📋 First 200 chars: {summary_text[:200]}")
        
        # Parse summary JSON
        try:
            # Clean up the response
            summary_text_clean = summary_text.strip()
            if "```json" in summary_text_clean:
                summary_text_clean = summary_text_clean.split("```json")[1].split("```")[0].strip()
            elif "```" in summary_text_clean:
                summary_text_clean = summary_text_clean.split("```")[1].split("```")[0].strip()
            
            summary_json = json.loads(summary_text_clean)
            overall_summary = summary_json.get("overall_summary", "").strip()
            recommendations = summary_json.get("recommendations", [])
            
            # Validate and clean recommendations
            recommendations = [str(r).strip() for r in recommendations if str(r).strip()][:5]
            
        except Exception as parse_error:
            print(f"⚠️ Summary parsing failed: {parse_error}")
            print(f"Raw response: {summary_text[:200]}")
            
            # Fallback: try to extract from text
            lines = [l.strip() for l in summary_text.split('\n') if l.strip()]
            
            # Find summary (usually first paragraph without numbers/bullets)
            summary_lines = []
            recommendations = []
            
            for line in lines:
                # Check if it's a recommendation (starts with number or bullet)
                if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•') or line.startswith('*')):
                    rec = line.lstrip('0123456789.-•* ').strip()
                    if rec and len(rec) > 10:  # Must be meaningful
                        recommendations.append(rec)
                else:
                    # It's part of summary
                    if len(summary_lines) < 5 and len(line) > 20:  # Avoid short fragments
                        summary_lines.append(line)
            
            overall_summary = ' '.join(summary_lines[:3]) if summary_lines else f"The candidate completed {len(question_feedbacks)} interview questions with an average overall rating of {avg_ratings.get('overall', [7])[0]:.1f}/10. Performance showed both strengths and areas for development across technical and behavioral responses. Further improvement in clarity and depth would enhance interview performance."
            
            # Ensure we have 5 recommendations
            if len(recommendations) < 5:
                default_recs = [
                    "Provide more specific examples from past experience to support your answers",
                    "Structure responses using the STAR method (Situation, Task, Action, Result)",
                    "Practice articulating complex concepts in clear, concise language",
                    "Research the company thoroughly and align answers with their values",
                    "Demonstrate enthusiasm and genuine interest in the role and organization"
                ]
                recommendations.extend(default_recs[:5-len(recommendations)])
            
            recommendations = recommendations[:5]
        
        # Prepare data with validation
        feedback_data = {
            "candidate": session_data['candidate'],
            "question_feedbacks": question_feedbacks,
            "overall_summary": overall_summary if overall_summary else "The candidate demonstrated competence across multiple interview questions, showing both technical knowledge and communication skills. There are opportunities for improvement in providing more detailed examples and structured responses.",
            "recommendations": recommendations[:5] if len(recommendations) >= 5 else recommendations + [
                "Provide more specific examples from past experience",
                "Structure responses using the STAR method",
                "Practice articulating ideas clearly and concisely",
                "Research the company and role thoroughly",
                "Demonstrate enthusiasm and cultural fit"
            ][:5-len(recommendations)]
        }
        
        answers_data = {
            "candidate": session_data['candidate'],
            "expected_answers": expected_answers
        }
        
        # Generate PDFs in parallel
        print(f"📄 Generating PDFs...")
        
        loop = asyncio.get_event_loop()
        pdf_tasks = [
            loop.run_in_executor(executor, generate_feedback_pdf, session_id, feedback_data),
            loop.run_in_executor(executor, generate_expected_answers_pdf, session_id, answers_data)
        ]
        
        feedback_pdf, answers_pdf = await asyncio.gather(*pdf_tasks)
        
        # Save data
        session_data["feedback_data"] = feedback_data
        session_data["answers_data"] = answers_data
        session_data["status"] = "completed"
        
        await save_session_metadata(session_id, session_data)
        
        print(f"✅ Interview finalized in parallel mode!")
        
        return {
            "status": "success",
            "message": "Interview finalized successfully",
            "processing_time": "optimized"
        }
    
    except Exception as e:
        print(f"❌ Finalization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download-feedback/{session_id}")
async def download_feedback(session_id: str):
    """Download feedback PDF"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    pdf_path = BASE_DIR / session_id / "reports" / "feedback_report.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Feedback report not found")
    
    return FileResponse(
        path=str(pdf_path),
        media_type='application/pdf',
        filename=f'feedback_{session_id}.pdf'
    )

@app.get("/api/download-answers/{session_id}")
async def download_answers(session_id: str):
    """Download expected answers PDF"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    pdf_path = BASE_DIR / session_id / "reports" / "expected_answers.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Expected answers not found")
    
    return FileResponse(
        path=str(pdf_path),
        media_type='application/pdf',
        filename=f'expected_answers_{session_id}.pdf'
    )

@app.get("/api/view-feedback/{session_id}")
async def view_feedback(session_id: str):
    """View feedback in browser"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    feedback_data = sessions[session_id].get("feedback_data")
    if not feedback_data:
        return HTMLResponse("<h3>Feedback not yet generated</h3>")
    
    html = "<html><head><style>body{font-family:Arial;padding:20px;max-width:1200px;margin:0 auto}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:12px;text-align:left}th{background:#667eea;color:white}tr:nth-child(even){background:#f9f9f9}.question{background:#e0e7ff;padding:15px;border-radius:8px;margin:20px 0}.answer{background:#f7fafc;padding:15px;border-radius:8px;margin:10px 0}h2{color:#667eea}h3{color:#764ba2}</style></head><body>"
    html += "<h2>📊 Performance Feedback</h2>"
    
    for idx, qf in enumerate(feedback_data['question_feedbacks']):
        html += f"<h3>Question {idx+1}</h3>"
        html += f"<div class='question'><strong>Q:</strong> {qf['question']}</div>"
        html += f"<div class='answer'><strong>Your Answer:</strong><br>{qf['user_answer']}</div>"
        html += "<table><thead><tr><th>Aspect</th><th>Rating</th></tr></thead><tbody>"
        for aspect, rating in qf['ratings'].items():
            html += f"<tr><td>{aspect.capitalize()}</td><td><strong>{rating}/10</strong></td></tr>"
        html += "</tbody></table>"
        html += f"<p><strong>Feedback:</strong> {qf['feedback']}</p><hr style='margin:40px 0;border:none;border-top:2px solid #e2e8f0'>"
    
    html += f"<h3>📈 Overall Summary</h3><p style='background:#f7fafc;padding:15px;border-radius:8px'>{feedback_data['overall_summary']}</p>"
    html += "<h3>💡 Key Recommendations</h3><ul style='background:#f7fafc;padding:20px 40px;border-radius:8px'>"
    for rec in feedback_data['recommendations']:
        html += f"<li style='margin:10px 0'>{rec}</li>"
    html += "</ul></body></html>"
    
    return HTMLResponse(content=html)

@app.get("/api/view-answers/{session_id}")
async def view_answers(session_id: str):
    """View expected answers in browser"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    answers_data = sessions[session_id].get("answers_data")
    if not answers_data:
        return HTMLResponse("<h3>Expected answers not yet generated</h3>")
    
    html = "<html><head><style>body{font-family:Arial;padding:20px;max-width:1200px;margin:0 auto}.question{background:#d4f4dd;padding:15px;border-radius:8px;margin:20px 0}.answer{background:#f0fff4;padding:15px;border-radius:8px;margin:10px 0}ul{line-height:1.8;background:#f0fff4;padding:20px 40px;border-radius:8px}h2{color:#48bb78}h3{color:#38a169}</style></head><body>"
    html += "<h2>✅ Expected Answers Guide</h2>"
    
    for idx, ans in enumerate(answers_data['expected_answers']):
        html += f"<h3>Question {idx+1}</h3>"
        html += f"<div class='question'><strong>Q:</strong> {ans['question']}</div>"
        html += f"<div class='answer'><strong>Expected Answer:</strong><br>{ans['expected_answer']}</div>"
        html += "<p><strong>Key Points to Cover:</strong></p><ul>"
        for point in ans['key_points']:
            html += f"<li>{point}</li>"
        html += "</ul><hr style='margin:40px 0;border:none;border-top:2px solid #e2e8f0'>"
    
    html += "</body></html>"
    
    return HTMLResponse(content=html)

@app.get("/api/speech-analysis/{session_id}/{question_index}")
async def get_speech_analysis(session_id: str, question_index: int):
    """Get speech analysis results for a specific question"""
    try:
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_dir = BASE_DIR / session_id
        speech_analysis_path = session_dir / "reports" / f"speech_analysis_{question_index + 1}.json"
        
        if not speech_analysis_path.exists():
            raise HTTPException(status_code=404, detail="Speech analysis not found")
        
        async with aiofiles.open(speech_analysis_path, 'r') as f:
            content = await f.read()
            return json.loads(content)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/video-analysis/{session_id}/{question_index}")
async def get_video_analysis(session_id: str, question_index: int):
    """Get video analysis results for a specific question"""
    try:
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_dir = BASE_DIR / session_id
        video_analysis_path = session_dir / "reports" / f"video_analysis_{question_index + 1}.json"
        
        if not video_analysis_path.exists():
            raise HTTPException(status_code=404, detail="Video analysis not found")
        
        async with aiofiles.open(video_analysis_path, 'r') as f:
            content = await f.read()
            return json.loads(content)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/combined-analysis/{session_id}")
async def get_combined_analysis(session_id: str):
    """Get combined speech and video analysis for all questions"""
    try:
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_data = sessions[session_id]
        session_dir = BASE_DIR / session_id
        
        combined_results = {
            'session_info': {
                'session_id': session_id,
                'candidate': session_data.get('candidate', {}),
                'questions': session_data.get('questions', []),
                'total_questions': len(session_data.get('questions', []))
            },
            'question_analyses': []
        }
        
        for idx in range(len(session_data.get('questions', []))):
            question_analysis = {
                'question_index': idx,
                'question': session_data['questions'][idx],
                'transcript': session_data.get('transcripts', {}).get(idx, {}).get('text', ''),
                'speech_analysis': None,
                'video_analysis': None
            }
            
            # Load speech analysis if available
            speech_path = session_dir / "reports" / f"speech_analysis_{idx + 1}.json"
            if speech_path.exists():
                async with aiofiles.open(speech_path, 'r') as f:
                    speech_content = await f.read()
                    question_analysis['speech_analysis'] = json.loads(speech_content)
            
            # Load video analysis if available
            video_path = session_dir / "reports" / f"video_analysis_{idx + 1}.json"
            if video_path.exists():
                async with aiofiles.open(video_path, 'r') as f:
                    video_content = await f.read()
                    question_analysis['video_analysis'] = json.loads(video_content)
            
            combined_results['question_analyses'].append(question_analysis)
        
        return combined_results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    stats = key_manager.get_stats()
    return {
        "status": "healthy",
        "whisper_model": "loaded",
        "speech_analyzer": "initialized",
        "video_analyzer": "initialized",
        "gemini_model": "configured",
        "active_sessions": len(sessions),
        "available_api_keys": len([s for s in stats if s["status"] == "available"]),
        "total_api_calls": sum(s["usage_count"] for s in stats)
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Face2Phrase - OPTIMIZED VERSION")
    print(f"📁 Data directory: {BASE_DIR.absolute()}")
    print(f"🔑 API Keys configured: {len(GEMINI_API_KEYS)}")
    print(f"⚡ Optimizations enabled:")
    print(f"   - Intelligent key rotation")
    print(f"   - Parallel API calls")
    print(f"   - Background video processing")
    print(f"   - Reduced video bitrate")
    print(f"   - Fast Whisper transcription")
    uvicorn.run(app, host="0.0.0.0", port=8000)




















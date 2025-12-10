import React, { useState, useRef, useEffect } from 'react';
import { Camera, StopCircle, Send, CheckCircle, Loader, User, Briefcase, FileText, Clock, BarChart3, AlertCircle, Activity } from 'lucide-react';
import ModernInterviewAssistant from './ModernApp';
import AnalysisDashboard from './AnalysisDashboard';

const App = () => {
  return <ModernInterviewAssistant />;
};

const LegacyInterviewAssistant = () => {
  const [step, setStep] = useState('form');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    experience: '',
    jd: ''
  });
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideos, setRecordedVideos] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [apiStats, setApiStats] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [resultsTab, setResultsTab] = useState('analysis');
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // NEW FEATURE: Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // NEW FEATURE: Fetch API stats
  const fetchApiStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/stats');
      const data = await response.json();
      setApiStats(data);
    } catch (error) {
      console.error('Error fetching API stats:', error);
    }
  };

  useEffect(() => {
    fetchApiStats();
    const interval = setInterval(fetchApiStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateQuestions = async () => {
    setIsGeneratingQuestions(true);
    try {
      const response = await fetch('http://localhost:8000/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      setQuestions(data.questions);
      setSessionId(data.session_id);
      setStep('interview');
    } catch (error) {
      alert('Error generating questions: ' + error.message);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedVideos(prev => ({
          ...prev,
          [currentQuestionIndex]: blob
        }));
        await uploadVideo(blob, currentQuestionIndex);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      alert('Error accessing camera: ' + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // const uploadVideo = async (blob, questionIndex) => {
  //   setIsUploading(true);
  //   const formData = new FormData();
  //   formData.append('video', blob, `question_${questionIndex + 1}.webm`);
  //   formData.append('session_id', sessionId);
  //   formData.append('question_index', questionIndex);
    
  //   try {
  //     const response = await fetch('http://localhost:8000/api/upload-video', {
  //       method: 'POST',
  //       body: formData
  //     });
  //     const data = await response.json();
  //     console.log('Upload successful:', data);
  //   } catch (error) {
  //     console.error('Upload error:', error);
  //     alert('Error uploading video: ' + error.message);
  //   } finally {
  //     setIsUploading(false);
  //   }
  // };


  const uploadVideo = async (blob, questionIndex) => {
    setIsUploading(true);
    
    // Compress video before upload
    const compressedBlob = await compressVideo(blob);
    
    const formData = new FormData();
    formData.append('video', compressedBlob, `question_${questionIndex + 1}.webm`);
    formData.append('session_id', sessionId);
    formData.append('question_index', questionIndex);
    
    try {
      const response = await fetch('http://localhost:8000/api/upload-video', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      console.log('Upload successful:', data);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading video: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const compressVideo = async (blob) => {
    // If video is already small, don't compress
    if (blob.size < 5 * 1024 * 1024) return blob; // < 5MB
    
    try {
      // Create video element to get dimensions
      const video = document.createElement('video');
      video.src = URL.createObjectURL(blob);
      await new Promise(resolve => video.onloadedmetadata = resolve);
      
      // Calculate compressed dimensions (max 720p)
      let width = video.videoWidth;
      let height = video.videoHeight;
      const maxDimension = 720;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      
      // Return original if compression not needed
      if (width === video.videoWidth && height === video.videoHeight) {
        return blob;
      }
      
      console.log(`Compressing video: ${video.videoWidth}x${video.videoHeight} -> ${width}x${height}`);
      return blob; // Browser doesn't support real-time compression easily
    } catch (error) {
      console.warn('Compression check failed, using original:', error);
      return blob;
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finalizeInterview();
    }
  };

  const finalizeInterview = async () => {
    setStep('processing');
    setProcessingProgress(0);
    
    // Simulate progress (since backend doesn't send real-time updates)
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 2000);
    
    try {
      const response = await fetch(`http://localhost:8000/api/finalize/${sessionId}`, {
        method: 'POST'
      });
      await response.json();
      clearInterval(progressInterval);
      setProcessingProgress(100);
      setTimeout(() => setStep('results'), 500);
    } catch (error) {
      clearInterval(progressInterval);
      alert('Error finalizing interview: ' + error.message);
    }
  };

  if (step === 'form') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '40px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#333', margin: '0 0 10px 0' }}>
              Face2Phrase
            </h1>
            <p style={{ color: '#666', fontSize: '18px' }}>AI-Powered Interview Assistant</p>
            
            {/* NEW FEATURE: API Status Indicator */}
            {apiStats && (
              <div style={{
                marginTop: '20px',
                padding: '12px',
                background: '#e0e7ff',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <BarChart3 style={{ width: '16px', height: '16px', color: '#667eea' }} />
                <span style={{ fontSize: '14px', color: '#667eea' }}>
                  {apiStats.api_keys.filter(k => k.status === 'available').length} API Keys Available
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                <User style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                placeholder="Enter your full name"
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                <Send style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                placeholder="your.email@example.com"
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                <Briefcase style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Target Position
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                placeholder="e.g., Software Engineer, Data Analyst"
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                <FileText style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Years of Experience
              </label>
              <input
                type="text"
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                placeholder="e.g., 2 years, Fresher"
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                <FileText style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Job Description
              </label>
              <textarea
                name="jd"
                value={formData.jd}
                onChange={handleInputChange}
                rows="6"
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  resize: 'vertical'
                }}
                placeholder="Paste the job description here..."
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <button
              onClick={generateQuestions}
              disabled={isGeneratingQuestions || !formData.name || !formData.email || !formData.position}
              style={{
                width: '100%',
                background: isGeneratingQuestions || !formData.name || !formData.email || !formData.position 
                  ? '#cbd5e0' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '16px',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: 'bold',
                border: 'none',
                cursor: isGeneratingQuestions || !formData.name || !formData.email || !formData.position ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s'
              }}
            >
              {isGeneratingQuestions ? (
                <>
                  <Loader style={{ width: '20px', height: '20px', marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                  Generating Questions...
                </>
              ) : (
                'Start Interview'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'interview') {
    const hasRecordedCurrentQuestion = recordedVideos[currentQuestionIndex];
    const completedQuestions = Object.keys(recordedVideos).length;
    const progress = (completedQuestions / questions.length) * 100;
    
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '40px'
        }}>
          {/* NEW FEATURE: Progress Bar */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}>
                Interview Progress
              </span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#667eea' }}>
                {completedQuestions}/{questions.length} completed
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e2e8f0',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', margin: 0 }}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {questions.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: recordedVideos[idx] ? '#48bb78' :
                                 idx === currentQuestionIndex ? '#667eea' :
                                 '#e2e8f0'
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #667eea'
            }}>
              <p style={{ fontSize: '20px', color: '#333', margin: 0, lineHeight: '1.6' }}>
                {questions[currentQuestionIndex]}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <div style={{
              background: '#000',
              borderRadius: '12px',
              overflow: 'hidden',
              aspectRatio: '16/9',
              marginBottom: '20px',
              position: 'relative'
            }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              
              {/* NEW FEATURE: Recording Timer Overlay */}
              {isRecording && (
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(229, 62, 62, 0.9)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 'bold'
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    background: 'white',
                    borderRadius: '50%',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}></div>
                  <Clock style={{ width: '16px', height: '16px' }} />
                  {formatTime(recordingTime)}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              {!isRecording && !hasRecordedCurrentQuestion && (
                <button
                  onClick={startRecording}
                  style={{
                    flex: 1,
                    background: '#e53e3e',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#c53030'}
                  onMouseOut={(e) => e.target.style.background = '#e53e3e'}
                >
                  <Camera style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                  Start Recording
                </button>
              )}

              {isRecording && (
                <button
                  onClick={stopRecording}
                  style={{
                    flex: 1,
                    background: '#4a5568',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s'
                  }}
                >
                  <StopCircle style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                  Stop Recording ({formatTime(recordingTime)})
                </button>
              )}

              {hasRecordedCurrentQuestion && !isUploading && (
                <button
                  onClick={nextQuestion}
                  style={{
                    flex: 1,
                    background: '#48bb78',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#38a169'}
                  onMouseOut={(e) => e.target.style.background = '#48bb78'}
                >
                  {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Interview'}
                </button>
              )}
            </div>

            {isUploading && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: '#e0e7ff',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#667eea'
              }}>
                <Loader style={{ width: '20px', height: '20px', marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                Uploading and processing video...
              </div>
            )}

            {isRecording && (
              <div style={{ 
                marginTop: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#e53e3e',
                fontSize: '14px'
              }}>
                <AlertCircle style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Recording in progress - Speak clearly and maintain eye contact
              </div>
            )}
          </div>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '60px',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%'
        }}>
          <Loader style={{ width: '64px', height: '64px', color: '#667eea', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0 0 10px 0' }}>
            Processing Your Interview
          </h2>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
            Analyzing your responses and generating feedback...
          </p>
          
          {/* NEW FEATURE: Processing Progress Bar */}
          <div style={{ marginTop: '30px' }}>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e2e8f0',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '8px'
            }}>
              <div style={{
                width: `${processingProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <span style={{ fontSize: '14px', color: '#667eea', fontWeight: '600' }}>
              {processingProgress}% Complete
            </span>
          </div>

          {/* NEW FEATURE: Processing Steps */}
          <div style={{ marginTop: '30px', textAlign: 'left' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: processingProgress > 20 ? '#e0e7ff' : '#f7fafc',
              borderRadius: '8px',
              marginBottom: '8px'
            }}>
              {processingProgress > 20 ? (
                <CheckCircle style={{ width: '20px', height: '20px', color: '#48bb78' }} />
              ) : (
                <Loader style={{ width: '20px', height: '20px', color: '#667eea', animation: 'spin 1s linear infinite' }} />
              )}
              <span style={{ fontSize: '14px', color: '#333' }}>Analyzing responses...</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: processingProgress > 60 ? '#e0e7ff' : '#f7fafc',
              borderRadius: '8px',
              marginBottom: '8px'
            }}>
              {processingProgress > 60 ? (
                <CheckCircle style={{ width: '20px', height: '20px', color: '#48bb78' }} />
              ) : (
                <Loader style={{ width: '20px', height: '20px', color: '#667eea', animation: processingProgress > 20 ? 'spin 1s linear infinite' : 'none' }} />
              )}
              <span style={{ fontSize: '14px', color: '#333' }}>Generating feedback...</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: processingProgress > 90 ? '#e0e7ff' : '#f7fafc',
              borderRadius: '8px'
            }}>
              {processingProgress > 90 ? (
                <CheckCircle style={{ width: '20px', height: '20px', color: '#48bb78' }} />
              ) : (
                <Loader style={{ width: '20px', height: '20px', color: '#667eea', animation: processingProgress > 60 ? 'spin 1s linear infinite' : 'none' }} />
              )}
              <span style={{ fontSize: '14px', color: '#333' }}>Creating reports...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'results') {
    
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          padding: '20px'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
            <CheckCircle style={{ width: '48px', height: '48px', color: '#48bb78', margin: '0 auto 15px' }} />
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0 0 10px 0' }}>
              Interview Complete!
            </h1>
            <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>
              Your interview has been successfully processed with advanced speech and video analysis.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ 
          background: 'white', 
          borderBottom: '1px solid #e2e8f0',
          padding: '0 20px'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '0' }}>
            {[
              { id: 'analysis', label: 'Advanced Analysis', icon: Activity },
              { id: 'reports', label: 'Traditional Reports', icon: FileText }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setResultsTab(tab.id)}
                  style={{
                    padding: '15px 25px',
                    border: 'none',
                    background: resultsTab === tab.id ? '#667eea' : 'transparent',
                    color: resultsTab === tab.id ? 'white' : '#667eea',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '8px 8px 0 0',
                    fontWeight: '600',
                    fontSize: '16px',
                    transition: 'all 0.3s'
                  }}
                >
                  <Icon style={{ width: '20px', height: '20px' }} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {resultsTab === 'analysis' && (
          <AnalysisDashboard sessionId={sessionId} />
        )}

        {resultsTab === 'reports' && (
          <div style={{ padding: '40px 20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              {/* Download Buttons */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                padding: '30px',
                marginBottom: '30px',
                textAlign: 'center'
              }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', margin: '0 0 20px 0' }}>
                  Download Reports
                </h2>
                
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`http://localhost:8000/api/download-feedback/${sessionId}`);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `feedback_${sessionId}.pdf`;
                        a.click();
                      } catch (error) {
                        alert('Error downloading feedback: ' + error.message);
                      }
                    }}
                    style={{
                      background: '#667eea',
                      color: 'white',
                      padding: '14px 28px',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <FileText style={{ width: '20px', height: '20px' }} />
                    Download Feedback Report
                  </button>
                  
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`http://localhost:8000/api/download-answers/${sessionId}`);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `expected_answers_${sessionId}.pdf`;
                        a.click();
                      } catch (error) {
                        alert('Error downloading answers: ' + error.message);
                      }
                    }}
                    style={{
                      background: '#48bb78',
                      color: 'white',
                      padding: '14px 28px',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <FileText style={{ width: '20px', height: '20px' }} />
                    Download Expected Answers
                  </button>
                </div>
              </div>

              {/* Report Previews */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  padding: '30px',
                  maxHeight: '600px',
                  overflow: 'auto'
                }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>
                    📊 Performance Feedback
                  </h3>
                  <iframe
                    src={`http://localhost:8000/api/view-feedback/${sessionId}`}
                    style={{
                      width: '100%',
                      minHeight: '500px',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    title="Feedback Report"
                  />
                </div>

                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  padding: '30px',
                  maxHeight: '600px',
                  overflow: 'auto'
                }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>
                    ✅ Expected Answers
                  </h3>
                  <iframe
                    src={`http://localhost:8000/api/view-answers/${sessionId}`}
                    style={{
                      width: '100%',
                      minHeight: '500px',
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    title="Expected Answers"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ 
          background: 'white', 
          borderTop: '1px solid #e2e8f0',
          padding: '20px',
          textAlign: 'center'
        }}>
          <button
            onClick={() => {
              setStep('form');
              setCurrentQuestionIndex(0);
              setRecordedVideos({});
              setFormData({ name: '', email: '', position: '', experience: '', jd: '' });
              setSessionId(null);
            }}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '16px 40px',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Start New Interview
          </button>
        </div>
      </div>
    );
  }
}
export default App;

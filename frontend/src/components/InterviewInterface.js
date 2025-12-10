import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, StopCircle, Send, CheckCircle, Loader, User, 
  Briefcase, FileText, Clock, BarChart3, AlertCircle, Play 
} from 'lucide-react';
import AcousticVisualization from './AcousticVisualization';

const InterviewInterface = ({ user, token, onSessionComplete }) => {
  const [step, setStep] = useState('form');
  const [formData, setFormData] = useState({
    name: user.full_name || '',
    email: user.email || '',
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
  const [processingProgress, setProcessingProgress] = useState(0);
  const [acousticData, setAcousticData] = useState({});
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Recording timer
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

  const uploadVideo = async (blob, questionIndex) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('video', blob, `question_${questionIndex + 1}.webm`);
    formData.append('session_id', sessionId);
    formData.append('question_index', questionIndex);
    
    try {
      const response = await fetch('http://localhost:8000/api/upload-video', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      console.log('Upload successful:', data);
      
      // Load acoustic features after upload
      setTimeout(() => loadAcousticFeatures(questionIndex), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading video: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const loadAcousticFeatures = async (questionIndex) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/acoustic-features/${sessionId}/${questionIndex}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setAcousticData(prev => ({
          ...prev,
          [questionIndex]: data
        }));
      }
    } catch (error) {
      console.error('Error loading acoustic features:', error);
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
    
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 2000);
    
    try {
      const response = await fetch(`http://localhost:8000/api/finalize/${sessionId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      // Save session to history
      const sessionData = {
        sessionId,
        position: formData.position,
        timestamp: new Date().toISOString(),
        questions: questions.length,
        acousticData
      };
      
      const history = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
      history.unshift(sessionData);
      localStorage.setItem('sessionHistory', JSON.stringify(history));
      
      setTimeout(() => {
        setStep('results');
        onSessionComplete();
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      alert('Error finalizing interview: ' + error.message);
    }
  };

  if (step === 'form') {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '40px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0 0 10px 0' }}>
              Start New Interview
            </h1>
            <p style={{ color: '#666', fontSize: '18px' }}>
              Fill in your details to generate personalized questions
            </p>
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
                <>
                  <Send style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                  Generate Interview Questions
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'interview') {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {/* Question and Video Panel */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            padding: '32px'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', margin: 0 }}>
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h2>
                <div style={{
                  background: '#f0f9ff',
                  color: '#0369a1',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
                </div>
              </div>
              
              <div style={{
                background: '#f8fafc',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{ fontSize: '18px', color: '#333', margin: 0, lineHeight: '1.6' }}>
                  {questions[currentQuestionIndex]}
                </p>
              </div>
            </div>

            {/* Video Recording */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                position: 'relative',
                background: '#000',
                borderRadius: '12px',
                overflow: 'hidden',
                aspectRatio: '16/9'
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                
                {isRecording && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: '#ef4444',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: 'white',
                      borderRadius: '50%',
                      animation: 'pulse 1s infinite'
                    }} />
                    {formatTime(recordingTime)}
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Camera size={20} />
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <StopCircle size={20} />
                  Stop Recording
                </button>
              )}

              {recordedVideos[currentQuestionIndex] && !isUploading && (
                <button
                  onClick={nextQuestion}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {currentQuestionIndex < questions.length - 1 ? (
                    <>
                      <Send size={20} />
                      Next Question
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Finish Interview
                    </>
                  )}
                </button>
              )}

              {isUploading && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#667eea',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  <Loader style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                  Processing...
                </div>
              )}
            </div>
          </div>

          {/* Acoustic Visualization Panel */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            padding: '32px'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>
              Acoustic Analysis
            </h3>
            
            {acousticData[currentQuestionIndex] ? (
              <AcousticVisualization 
                data={acousticData[currentQuestionIndex]} 
                questionIndex={currentQuestionIndex}
              />
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '400px',
                color: '#666',
                textAlign: 'center'
              }}>
                <BarChart3 size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p style={{ fontSize: '16px', margin: 0 }}>
                  Record your answer to see acoustic analysis
                </p>
                <p style={{ fontSize: '14px', margin: '8px 0 0 0', opacity: 0.7 }}>
                  Pitch, energy, and spectral features will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '60px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto'
          }}>
            <Loader style={{ width: '40px', height: '40px', color: 'white', animation: 'spin 1s linear infinite' }} />
          </div>
          
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>
            Processing Your Interview
          </h2>
          
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '32px' }}>
            Analyzing your responses and generating feedback...
          </p>
          
          <div style={{
            width: '100%',
            height: '8px',
            background: '#e2e8f0',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '16px'
          }}>
            <div style={{
              width: `${processingProgress}%`,
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              transition: 'width 0.5s ease'
            }} />
          </div>
          
          <p style={{ color: '#667eea', fontSize: '14px', fontWeight: '600' }}>
            {processingProgress}% Complete
          </p>
        </div>
      </div>
    );
  }

  if (step === 'results') {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto'
          }}>
            <CheckCircle style={{ width: '40px', height: '40px', color: 'white' }} />
          </div>
          
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>
            Interview Complete!
          </h2>
          
          <p style={{ color: '#666', fontSize: '18px', marginBottom: '32px' }}>
            Your interview has been processed successfully. You can now view your results and acoustic analysis.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button
              onClick={() => setStep('form')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '16px 32px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Start New Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default InterviewInterface;
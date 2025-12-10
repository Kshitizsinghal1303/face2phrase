import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, StopCircle, Send, CheckCircle, Loader, User, Briefcase, 
  FileText, Clock, BarChart3, AlertCircle, Activity, Play, Pause,
  Download, Eye, Mic, Video, Brain, TrendingUp, Award, Target,
  Zap, Shield, Star, ChevronRight, RefreshCw, Settings
} from 'lucide-react';
import AnalysisDashboard from './AnalysisDashboard';

const ModernInterviewAssistant = () => {
  const [step, setStep] = useState('welcome');
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
  const [systemStatus, setSystemStatus] = useState('checking');
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Check system status on load
  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/health');
      const health = await response.json();
      setSystemStatus('ready');
      setApiStats(health);
    } catch (error) {
      setSystemStatus('error');
      console.error('System health check failed:', error);
    }
  };

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
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateQuestions = async () => {
    setIsGeneratingQuestions(true);
    try {
      const response = await fetch('http://localhost:8000/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions);
        setSessionId(data.session_id);
        setStep('interview');
      } else {
        throw new Error('Failed to generate questions');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Failed to generate questions. Please try again.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please check camera permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedVideos(prev => ({
          ...prev,
          [currentQuestionIndex]: blob
        }));
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
    }
  };

  const uploadAndAnalyze = async () => {
    setIsUploading(true);
    setProcessingProgress(0);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('session_id', sessionId);
      formDataToSend.append('candidate_info', JSON.stringify(formData));
      formDataToSend.append('questions', JSON.stringify(questions));
      
      Object.entries(recordedVideos).forEach(([index, blob]) => {
        formDataToSend.append(`video_${index}`, blob, `question_${index}.webm`);
      });
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 10, 90));
      }, 500);
      
      const response = await fetch('http://localhost:8000/api/analyze-interview', {
        method: 'POST',
        body: formDataToSend
      });
      
      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      if (response.ok) {
        setStep('results');
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Failed to analyze interview. Please try again.');
    } finally {
      setIsUploading(false);
      setProcessingProgress(0);
    }
  };

  // Welcome Screen
  const WelcomeScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg">
              <Brain className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Face2Phrase
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-Powered Interview Assistant with Advanced Speech & Video Analysis
          </p>
        </div>

        {/* System Status */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">System Status</h2>
              <button 
                onClick={checkSystemHealth}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
            
            {systemStatus === 'checking' && (
              <div className="flex items-center gap-3 text-yellow-600">
                <Loader className="w-5 h-5 animate-spin" />
                <span>Checking system health...</span>
              </div>
            )}
            
            {systemStatus === 'ready' && apiStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <div className="font-semibold text-green-800">System Ready</div>
                    <div className="text-sm text-green-600">All services operational</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                  <Mic className="w-6 h-6 text-blue-600" />
                  <div>
                    <div className="font-semibold text-blue-800">Speech Analysis</div>
                    <div className="text-sm text-blue-600">
                      {apiStats.whisper_available ? '✅ Real Whisper' : '⚠️ Fallback Mode'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
                  <Video className="w-6 h-6 text-purple-600" />
                  <div>
                    <div className="font-semibold text-purple-800">Video Analysis</div>
                    <div className="text-sm text-purple-600">
                      {apiStats.video_analysis_available ? '✅ Real CV' : '⚠️ Fallback Mode'}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {systemStatus === 'error' && (
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl text-red-600">
                <AlertCircle className="w-6 h-6" />
                <div>
                  <div className="font-semibold">System Error</div>
                  <div className="text-sm">Please ensure the backend server is running</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Advanced AI-Powered Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Mic className="w-8 h-8" />}
              title="Real Speech Analysis"
              description="Extract pitch, frequency spectrum, energy levels, and speech rate with LibROSA"
              color="blue"
            />
            <FeatureCard 
              icon={<Video className="w-8 h-8" />}
              title="Facial Expression Detection"
              description="Real-time emotion analysis using MediaPipe computer vision"
              color="purple"
            />
            <FeatureCard 
              icon={<Brain className="w-8 h-8" />}
              title="AI Question Generation"
              description="Smart interview questions based on job description and experience"
              color="green"
            />
            <FeatureCard 
              icon={<BarChart3 className="w-8 h-8" />}
              title="Interactive Visualizations"
              description="Dynamic charts and graphs powered by Plotly"
              color="orange"
            />
            <FeatureCard 
              icon={<FileText className="w-8 h-8" />}
              title="Comprehensive Reports"
              description="Detailed PDF reports with insights and recommendations"
              color="red"
            />
            <FeatureCard 
              icon={<Shield className="w-8 h-8" />}
              title="Privacy First"
              description="All processing happens locally with secure data handling"
              color="indigo"
            />
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <button
            onClick={() => setStep('form')}
            disabled={systemStatus !== 'ready'}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <User className="w-6 h-6" />
            Start Your Interview
            <ChevronRight className="w-5 h-5" />
          </button>
          {systemStatus !== 'ready' && (
            <p className="text-sm text-gray-500 mt-2">
              Please wait for system initialization to complete
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Feature Card Component
  const FeatureCard = ({ icon, title, description, color }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600',
      purple: 'from-purple-500 to-purple-600 bg-purple-50 text-purple-600',
      green: 'from-green-500 to-green-600 bg-green-50 text-green-600',
      orange: 'from-orange-500 to-orange-600 bg-orange-50 text-orange-600',
      red: 'from-red-500 to-red-600 bg-red-50 text-red-600',
      indigo: 'from-indigo-500 to-indigo-600 bg-indigo-50 text-indigo-600'
    };

    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
        <div className={`inline-flex p-3 rounded-xl mb-4 bg-gradient-to-r ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]}`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    );
  };

  // Enhanced Form Screen
  const FormScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-4">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">Step 1 of 3</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Tell Us About Yourself</h1>
            <p className="text-gray-600">Help us create personalized interview questions</p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Position Applied For *
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., Software Engineer, Product Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Years of Experience *
                </label>
                <select
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select experience level</option>
                  <option value="0-1">0-1 years (Entry Level)</option>
                  <option value="2-3">2-3 years (Junior)</option>
                  <option value="4-6">4-6 years (Mid-Level)</option>
                  <option value="7-10">7-10 years (Senior)</option>
                  <option value="10+">10+ years (Expert)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Job Description *
                </label>
                <textarea
                  value={formData.jd}
                  onChange={(e) => setFormData({...formData, jd: e.target.value})}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Paste the job description here..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => setStep('welcome')}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                ← Back
              </button>
              
              <button
                onClick={generateQuestions}
                disabled={!formData.name || !formData.email || !formData.position || !formData.experience || !formData.jd || isGeneratingQuestions}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isGeneratingQuestions ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Generate Questions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Enhanced Interview Screen
  const InterviewScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full mb-4">
              <Video className="w-4 h-4" />
              <span className="text-sm font-medium">Step 2 of 3 - Interview</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Question {currentQuestionIndex + 1} of {questions.length}
            </h1>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Question Panel */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Interview Question</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {questions[currentQuestionIndex]?.question}
                  </p>
                </div>
              </div>

              {/* Question Navigation */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
                >
                  ← Previous
                </button>
                
                <span className="text-sm text-gray-500">
                  {currentQuestionIndex + 1} / {questions.length}
                </span>
                
                <button
                  onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Video Panel */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Record Your Answer</h3>
                <p className="text-gray-600">Take your time and speak clearly</p>
              </div>

              {/* Video Display */}
              <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Recording Indicator */}
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-sm font-medium">REC {formatTime(recordingTime)}</span>
                  </div>
                )}

                {/* Status Overlay */}
                {recordedVideos[currentQuestionIndex] && !isRecording && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                      <p className="font-medium">Answer Recorded</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recording Controls */}
              <div className="flex justify-center gap-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-lg hover:bg-red-700 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-white font-semibold rounded-xl shadow-lg hover:bg-gray-900 transition-colors"
                  >
                    <StopCircle className="w-5 h-5" />
                    Stop Recording
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-between items-center mt-8">
            <div className="text-sm text-gray-600">
              Recorded: {Object.keys(recordedVideos).length} / {questions.length} questions
            </div>
            
            <button
              onClick={uploadAndAnalyze}
              disabled={Object.keys(recordedVideos).length === 0 || isUploading}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isUploading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Analyzing... {processingProgress}%
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Analyze Interview
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Main render logic
  if (step === 'welcome') return <WelcomeScreen />;
  if (step === 'form') return <FormScreen />;
  if (step === 'interview') return <InterviewScreen />;
  if (step === 'results') return <AnalysisDashboard sessionId={sessionId} />;

  return null;
};

export default ModernInterviewAssistant;
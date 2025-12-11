import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  StopCircle, 
  Send, 
  CheckCircle, 
  Loader, 
  User, 
  Briefcase, 
  FileText, 
  Clock, 
  BarChart3, 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Home
} from 'lucide-react';
import toast from 'react-hot-toast';

const ModernInterviewInterface = ({ onBackToDashboard }) => {
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

  // Fetch API stats
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
    const interval = setInterval(fetchApiStats, 10000);
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
      toast.success('Questions generated successfully!');
    } catch (error) {
      toast.error('Error generating questions: ' + error.message);
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
      toast.success('Recording started!');
    } catch (error) {
      toast.error('Error accessing camera: ' + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      toast.success('Recording stopped!');
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
        body: formData
      });
      const data = await response.json();
      console.log('Upload successful:', data);
      toast.success('Video uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error uploading video: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const nextQuestion = () => {
    if (questions.length > 0 && currentQuestionIndex < questions.length - 1) {
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
        method: 'POST'
      });
      const data = await response.json();
      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      // Save to interview history
      const history = JSON.parse(localStorage.getItem('interview_history') || '[]');
      history.push({
        sessionId,
        position: formData.position,
        date: new Date().toLocaleDateString(),
        score: Math.floor(Math.random() * 20) + 75, // Mock score
        questions: questions.length || 0
      });
      localStorage.setItem('interview_history', JSON.stringify(history));
      
      setTimeout(() => setStep('results'), 500);
      toast.success('Interview completed successfully!');
    } catch (error) {
      clearInterval(progressInterval);
      toast.error('Error finalizing interview: ' + error.message);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
            <button
              onClick={onBackToDashboard}
              className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            
            {apiStats && (
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-lg rounded-lg px-3 py-2 border border-white/20">
                <BarChart3 className="w-4 h-4 text-green-400" />
                <span className="text-white text-sm">
                  {apiStats?.api_keys?.filter(k => k.status === 'available')?.length || 0} API Keys Ready
                </span>
              </div>
            )}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8"
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-4">
                Start Your Interview
              </h1>
              <p className="text-white/70 text-lg">
                Fill in your details to generate personalized interview questions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={itemVariants}>
                <label className="flex items-center text-sm font-semibold text-white mb-3">
                  <User className="w-4 h-4 mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="Enter your full name"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="flex items-center text-sm font-semibold text-white mb-3">
                  <Send className="w-4 h-4 mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="your.email@example.com"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="flex items-center text-sm font-semibold text-white mb-3">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Target Position
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="e.g., Software Engineer, Data Analyst"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="flex items-center text-sm font-semibold text-white mb-3">
                  <FileText className="w-4 h-4 mr-2" />
                  Years of Experience
                </label>
                <input
                  type="text"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="e.g., 2 years, Fresher"
                />
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="mt-6">
              <label className="flex items-center text-sm font-semibold text-white mb-3">
                <FileText className="w-4 h-4 mr-2" />
                Job Description
              </label>
              <textarea
                name="jd"
                value={formData.jd}
                onChange={handleInputChange}
                rows="6"
                className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none"
                placeholder="Paste the job description here..."
              />
            </motion.div>

            <motion.div variants={itemVariants} className="mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={generateQuestions}
                disabled={isGeneratingQuestions || !formData.name || !formData.email || !formData.position}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center justify-center space-x-3"
              >
                {isGeneratingQuestions ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Generating Questions...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Generate Interview Questions</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (step === 'interview') {
    // Safety check for questions array
    if (!questions || questions.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-white text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading questions...</p>
          </div>
        </div>
      );
    }
    
    const hasRecordedCurrentQuestion = recordedVideos[currentQuestionIndex];
    const completedQuestions = Object.keys(recordedVideos).length;
    const progress = (completedQuestions / questions.length) * 100;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header with Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setStep('form')}
                className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Form</span>
              </button>
              
              <div className="text-white text-center">
                <h2 className="text-2xl font-bold">Question {currentQuestionIndex + 1} of {questions.length || 0}</h2>
                <p className="text-white/70">{completedQuestions} completed</p>
              </div>
              
              <button
                onClick={onBackToDashboard}
                className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200"
              >
                <Home className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              />
            </div>
            
            {/* Question Indicators */}
            <div className="flex justify-center space-x-2 mt-4">
              {(questions || []).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    recordedVideos[idx] ? 'bg-green-500' :
                    idx === currentQuestionIndex ? 'bg-purple-500' :
                    'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Question Panel */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Current Question</h3>
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
                <p className="text-white text-lg leading-relaxed">
                  {questions && questions[currentQuestionIndex] ? questions[currentQuestionIndex] : 'Loading question...'}
                </p>
              </div>
              
              {/* Recording Controls */}
              <div className="mt-6 space-y-4">
                {isRecording && (
                  <div className="flex items-center justify-center space-x-2 text-red-400">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">Recording: {formatTime(recordingTime)}</span>
                  </div>
                )}
                
                <div className="flex space-x-4">
                  {!isRecording ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startRecording}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all duration-300"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Start Recording</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={stopRecording}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all duration-300"
                    >
                      <StopCircle className="w-5 h-5" />
                      <span>Stop Recording</span>
                    </motion.button>
                  )}
                </div>
                
                {hasRecordedCurrentQuestion && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={nextQuestion}
                    disabled={isUploading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 transition-all duration-300"
                  >
                    {isUploading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (questions.length > 0 && currentQuestionIndex < questions.length - 1) ? (
                      <>
                        <ArrowRight className="w-5 h-5" />
                        <span>Next Question</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>Complete Interview</span>
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </motion.div>

            {/* Video Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Video Preview</h3>
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center text-white">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-70">Camera preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 text-center max-w-md w-full"
        >
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader className="w-8 h-8 text-white animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Processing Interview</h2>
            <p className="text-white/70">Analyzing your responses and generating feedback...</p>
          </div>
          
          <div className="mb-6">
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${processingProgress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              />
            </div>
            <p className="text-white text-sm">{processingProgress}% Complete</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-white/70">
              <CheckCircle className={`w-5 h-5 ${processingProgress > 20 ? 'text-green-400' : ''}`} />
              <span>Transcribing audio...</span>
            </div>
            <div className="flex items-center space-x-3 text-white/70">
              <CheckCircle className={`w-5 h-5 ${processingProgress > 50 ? 'text-green-400' : ''}`} />
              <span>Analyzing responses...</span>
            </div>
            <div className="flex items-center space-x-3 text-white/70">
              <CheckCircle className={`w-5 h-5 ${processingProgress > 80 ? 'text-green-400' : ''}`} />
              <span>Generating feedback...</span>
            </div>
            <div className="flex items-center space-x-3 text-white/70">
              <CheckCircle className={`w-5 h-5 ${processingProgress >= 100 ? 'text-green-400' : ''}`} />
              <span>Creating reports...</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Interview Complete!</h1>
            <p className="text-white/70 text-lg">Your interview has been successfully processed. Download your reports below.</p>
          </motion.div>

          {/* Download Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4 mb-8"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                try {
                  const response = await fetch(`http://localhost:8000/api/download-feedback/${sessionId}`);
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `feedback_${sessionId}.pdf`;
                  a.click();
                  toast.success('Feedback report downloaded!');
                } catch (error) {
                  toast.error('Error downloading feedback: ' + error.message);
                }
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
            >
              <FileText className="w-5 h-5" />
              <span>Download Feedback Report</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                try {
                  const response = await fetch(`http://localhost:8000/api/download-answers/${sessionId}`);
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `expected_answers_${sessionId}.pdf`;
                  a.click();
                  toast.success('Expected answers downloaded!');
                } catch (error) {
                  toast.error('Error downloading answers: ' + error.message);
                }
              }}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-green-600 hover:to-green-700 transition-all duration-300"
            >
              <FileText className="w-5 h-5" />
              <span>Download Expected Answers</span>
            </motion.button>
          </motion.div>

          {/* Report Previews */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
            >
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Performance Feedback</span>
              </h3>
              <iframe
                src={`http://localhost:8000/api/view-feedback/${sessionId}`}
                className="w-full h-96 border-none rounded-xl bg-white"
                title="Feedback Report"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
            >
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Expected Answers</span>
              </h3>
              <iframe
                src={`http://localhost:8000/api/view-answers/${sessionId}`}
                className="w-full h-96 border-none rounded-xl bg-white"
                title="Expected Answers"
              />
            </motion.div>
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setStep('form');
                setCurrentQuestionIndex(0);
                setRecordedVideos({});
                setFormData({ name: '', email: '', position: '', experience: '', jd: '' });
                setSessionId(null);
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Start New Interview</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBackToDashboard}
              className="bg-white/10 text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 flex items-center space-x-2 border border-white/20"
            >
              <Home className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    );
  }
};

export default ModernInterviewInterface;
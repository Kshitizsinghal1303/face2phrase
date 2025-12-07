import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { BarChart3, Activity, Eye, Mic, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

const AnalysisDashboard = ({ sessionId }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (sessionId) {
      fetchAnalysisData();
    }
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/combined-analysis/${sessionId}`);
      const data = await response.json();
      setAnalysisData(data);
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => {
    if (!analysisData) return null;

    const totalQuestions = analysisData.question_analyses.length;
    const speechAnalyzed = analysisData.question_analyses.filter(q => q.speech_analysis).length;
    const videoAnalyzed = analysisData.question_analyses.filter(q => q.video_analysis).length;

    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ color: '#667eea', marginBottom: '30px' }}>📊 Analysis Overview</h2>
        
        {/* Summary Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px', 
          marginBottom: '30px' 
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <BarChart3 style={{ width: '32px', height: '32px', margin: '0 auto 10px' }} />
            <h3 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>{totalQuestions}</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>Total Questions</p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <Mic style={{ width: '32px', height: '32px', margin: '0 auto 10px' }} />
            <h3 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>{speechAnalyzed}</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>Speech Analyzed</p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <Eye style={{ width: '32px', height: '32px', margin: '0 auto 10px' }} />
            <h3 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>{videoAnalyzed}</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>Video Analyzed</p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #9f7aea 0%, #805ad5 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <TrendingUp style={{ width: '32px', height: '32px', margin: '0 auto 10px' }} />
            <h3 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>
              {Math.round((speechAnalyzed + videoAnalyzed) / (totalQuestions * 2) * 100)}%
            </h3>
            <p style={{ margin: 0, opacity: 0.9 }}>Analysis Complete</p>
          </div>
        </div>

        {/* Question List */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#667eea', marginBottom: '20px' }}>Question Analysis Status</h3>
          {analysisData.question_analyses.map((question, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '15px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              marginBottom: '10px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              background: selectedQuestion === index ? '#f7fafc' : 'white'
            }}
            onClick={() => setSelectedQuestion(index)}
            >
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#2d3748' }}>Question {index + 1}</h4>
                <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>
                  {question.question.substring(0, 80)}...
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {question.speech_analysis ? (
                  <CheckCircle style={{ width: '20px', height: '20px', color: '#48bb78' }} />
                ) : (
                  <AlertCircle style={{ width: '20px', height: '20px', color: '#ed8936' }} />
                )}
                <span style={{ fontSize: '12px', color: '#718096' }}>Speech</span>
                
                {question.video_analysis ? (
                  <CheckCircle style={{ width: '20px', height: '20px', color: '#48bb78' }} />
                ) : (
                  <AlertCircle style={{ width: '20px', height: '20px', color: '#ed8936' }} />
                )}
                <span style={{ fontSize: '12px', color: '#718096' }}>Video</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSpeechAnalysis = () => {
    const currentQuestion = analysisData?.question_analyses[selectedQuestion];
    const speechData = currentQuestion?.speech_analysis;

    if (!speechData) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <AlertCircle style={{ width: '48px', height: '48px', color: '#ed8936', margin: '0 auto 20px' }} />
          <h3>Speech Analysis Not Available</h3>
          <p>Speech analysis is still processing or not available for this question.</p>
        </div>
      );
    }

    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ color: '#667eea', marginBottom: '20px' }}>
          🎤 Speech Analysis - Question {selectedQuestion + 1}
        </h2>

        {/* Speech Metrics */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px', 
          marginBottom: '30px' 
        }}>
          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#667eea' }}>Mean Pitch</h4>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              {speechData.report?.pitch_analysis?.mean_pitch || 0} Hz
            </p>
          </div>
          
          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#667eea' }}>Speech Rate</h4>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              {Math.round((speechData.report?.speech_timing?.speech_rate || 0) * 100)}%
            </p>
          </div>
          
          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#667eea' }}>Energy Level</h4>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              {speechData.report?.energy_analysis?.volume_consistency || 'N/A'}
            </p>
          </div>
          
          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#667eea' }}>Voice Clarity</h4>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              {speechData.report?.spectral_analysis?.voice_clarity || 'N/A'}
            </p>
          </div>
        </div>

        {/* Interactive Visualization */}
        {speechData.visualization && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#667eea', marginBottom: '20px' }}>Interactive Speech Analysis</h3>
            <Plot
              data={JSON.parse(speechData.visualization).data}
              layout={{
                ...JSON.parse(speechData.visualization).layout,
                autosize: true,
                height: 600
              }}
              config={{ responsive: true }}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* Recommendations */}
        {speechData.report?.recommendations && (
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            marginTop: '20px'
          }}>
            <h3 style={{ color: '#667eea', marginBottom: '15px' }}>💡 Recommendations</h3>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {speechData.report.recommendations.map((rec, index) => (
                <li key={index} style={{ marginBottom: '8px', color: '#2d3748' }}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderVideoAnalysis = () => {
    const currentQuestion = analysisData?.question_analyses[selectedQuestion];
    const videoData = currentQuestion?.video_analysis;

    if (!videoData) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <AlertCircle style={{ width: '48px', height: '48px', color: '#ed8936', margin: '0 auto 20px' }} />
          <h3>Video Analysis Not Available</h3>
          <p>Video analysis is still processing or not available for this question.</p>
        </div>
      );
    }

    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ color: '#667eea', marginBottom: '20px' }}>
          📹 Video Analysis - Question {selectedQuestion + 1}
        </h2>

        {/* Video Metrics */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px', 
          marginBottom: '30px' 
        }}>
          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#667eea' }}>Dominant Emotion</h4>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
              {videoData.report?.emotion_analysis?.dominant_emotion || 'N/A'}
            </p>
          </div>
          
          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#667eea' }}>Eye Contact</h4>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
              {videoData.report?.facial_expression?.eye_contact_quality || 'N/A'}
            </p>
          </div>
          
          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#667eea' }}>Engagement</h4>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
              {videoData.report?.engagement_assessment?.overall_engagement || 'N/A'}
            </p>
          </div>
          
          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#667eea' }}>Face Detection</h4>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
              {Math.round((videoData.report?.video_summary?.face_detection_rate || 0) * 100)}%
            </p>
          </div>
        </div>

        {/* Interactive Visualization */}
        {videoData.visualization && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#667eea', marginBottom: '20px' }}>Interactive Video Analysis</h3>
            <Plot
              data={JSON.parse(videoData.visualization).data}
              layout={{
                ...JSON.parse(videoData.visualization).layout,
                autosize: true,
                height: 600
              }}
              config={{ responsive: true }}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* Recommendations */}
        {videoData.report?.recommendations && (
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            marginTop: '20px'
          }}>
            <h3 style={{ color: '#667eea', marginBottom: '15px' }}>💡 Recommendations</h3>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {videoData.report.recommendations.map((rec, index) => (
                <li key={index} style={{ marginBottom: '8px', color: '#2d3748' }}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        flexDirection: 'column'
      }}>
        <Activity style={{ width: '48px', height: '48px', color: '#667eea', marginBottom: '20px' }} className="animate-spin" />
        <p style={{ color: '#667eea', fontSize: '18px' }}>Loading analysis data...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Navigation Tabs */}
      <div style={{ 
        background: 'white', 
        borderBottom: '1px solid #e2e8f0',
        padding: '0 20px'
      }}>
        <div style={{ display: 'flex', gap: '0' }}>
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'speech', label: 'Speech Analysis', icon: Mic },
            { id: 'video', label: 'Video Analysis', icon: Eye }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '15px 25px',
                  border: 'none',
                  background: activeTab === tab.id ? '#667eea' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#667eea',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '8px 8px 0 0',
                  fontWeight: '600',
                  transition: 'all 0.3s'
                }}
              >
                <Icon style={{ width: '18px', height: '18px' }} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Selector for Speech/Video tabs */}
      {(activeTab === 'speech' || activeTab === 'video') && analysisData && (
        <div style={{ 
          background: 'white', 
          padding: '15px 20px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2d3748' }}>
            Select Question:
          </label>
          <select
            value={selectedQuestion}
            onChange={(e) => setSelectedQuestion(parseInt(e.target.value))}
            style={{
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '200px'
            }}
          >
            {analysisData.question_analyses.map((_, index) => (
              <option key={index} value={index}>
                Question {index + 1}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'speech' && renderSpeechAnalysis()}
      {activeTab === 'video' && renderVideoAnalysis()}
    </div>
  );
};

export default AnalysisDashboard;
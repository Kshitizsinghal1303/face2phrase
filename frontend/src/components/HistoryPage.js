import React, { useState, useEffect } from 'react';
import { 
  History, Calendar, User, Briefcase, BarChart3, 
  Download, Eye, FileText, Clock, TrendingUp 
} from 'lucide-react';
import AcousticVisualization from './AcousticVisualization';

const HistoryPage = ({ user, token, sessionHistory }) => {
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadSessionDetails = async (sessionId) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/session-history/${sessionId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setSessionDetails(data);
      } else {
        console.error('Failed to load session details');
      }
    } catch (error) {
      console.error('Error loading session details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionClick = (session) => {
    setSelectedSession(session);
    if (session.sessionId) {
      loadSessionDetails(session.sessionId);
    }
  };

  const downloadReport = async (sessionId, type = 'feedback') => {
    try {
      const endpoint = type === 'feedback' 
        ? `/api/download-feedback/${sessionId}`
        : `/api/download-answers/${sessionId}`;
        
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_report_${sessionId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  if (sessionHistory.length === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '60px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto'
          }}>
            <History style={{ width: '40px', height: '40px', color: 'white' }} />
          </div>
          
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>
            No Interview History
          </h2>
          
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '32px' }}>
            Complete your first interview to see your session history and acoustic analysis here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedSession ? '1fr 2fr' : '1fr',
        gap: '24px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Session List */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '24px'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
              Interview History
            </h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              {sessionHistory.length} session{sessionHistory.length !== 1 ? 's' : ''} completed
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sessionHistory.map((session, index) => (
              <div
                key={index}
                onClick={() => handleSessionClick(session)}
                style={{
                  padding: '16px',
                  border: selectedSession === session ? '2px solid #667eea' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: selectedSession === session ? '#f8fafc' : 'white'
                }}
                onMouseEnter={(e) => {
                  if (selectedSession !== session) {
                    e.target.style.borderColor = '#cbd5e0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSession !== session) {
                    e.target.style.borderColor = '#e2e8f0';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Briefcase size={16} style={{ color: '#667eea' }} />
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                      {session.position || 'Interview Session'}
                    </span>
                  </div>
                  <div style={{
                    background: '#e0e7ff',
                    color: '#667eea',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {session.questions || 0} questions
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#666' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} />
                    {new Date(session.timestamp).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} />
                    {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {session.acousticData && Object.keys(session.acousticData).length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BarChart3 size={14} />
                      Acoustic data
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Details */}
        {selectedSession && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            padding: '24px'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', margin: 0 }}>
                  {selectedSession.position || 'Interview Session'}
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedSession.sessionId && (
                    <>
                      <button
                        onClick={() => downloadReport(selectedSession.sessionId, 'feedback')}
                        style={{
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Download size={14} />
                        Feedback
                      </button>
                      <button
                        onClick={() => downloadReport(selectedSession.sessionId, 'answers')}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FileText size={14} />
                        Answers
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                    {selectedSession.questions || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Questions</div>
                </div>
                
                <div style={{
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                    {selectedSession.acousticData ? Object.keys(selectedSession.acousticData).length : 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Acoustic Analyses</div>
                </div>
                
                <div style={{
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f59e0b' }}>
                    {new Date(selectedSession.timestamp).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Date</div>
                </div>
              </div>
            </div>

            {/* Acoustic Data Visualization */}
            {selectedSession.acousticData && Object.keys(selectedSession.acousticData).length > 0 && (
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>
                  Acoustic Analysis
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(selectedSession.acousticData).map(([questionIndex, data]) => (
                    <div key={questionIndex} style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px'
                    }}>
                      <h5 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                        Question {parseInt(questionIndex) + 1}
                      </h5>
                      
                      <div style={{ height: '300px' }}>
                        <AcousticVisualization 
                          data={data} 
                          questionIndex={parseInt(questionIndex)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Details from API */}
            {loading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                color: '#666'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #e2e8f0',
                    borderTop: '2px solid #667eea',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Loading session details...
                </div>
              </div>
            )}

            {sessionDetails && (
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>
                  Session Details
                </h4>
                
                <div style={{
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    <strong>Candidate:</strong> {sessionDetails.candidate?.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    <strong>Position:</strong> {sessionDetails.candidate?.position}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    <strong>Experience:</strong> {sessionDetails.candidate?.experience}
                  </div>
                </div>

                {sessionDetails.history && sessionDetails.history.length > 0 && (
                  <div>
                    <h5 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                      Questions & Responses
                    </h5>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {sessionDetails.history.map((item, index) => (
                        <div key={index} style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '12px'
                        }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                            Q{index + 1}: {item.question}
                          </div>
                          {item.transcript && (
                            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                              <strong>Response:</strong> {item.transcript}
                            </div>
                          )}
                          {item.has_acoustic_data && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              color: '#10b981'
                            }}>
                              <BarChart3 size={12} />
                              Acoustic analysis available
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!selectedSession.acousticData && !loading && !sessionDetails && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                color: '#666',
                textAlign: 'center'
              }}>
                <TrendingUp size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p style={{ fontSize: '16px', margin: 0 }}>
                  No detailed data available for this session
                </p>
                <p style={{ fontSize: '14px', margin: '8px 0 0 0', opacity: 0.7 }}>
                  Complete a new interview to see acoustic analysis
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
import React, { useState, useEffect } from 'react';
import { 
  Home, MessageSquare, History, Settings, LogOut, User, 
  Menu, X, BarChart3, Mic, Play, Download 
} from 'lucide-react';
import InterviewInterface from './InterviewInterface';
import HistoryPage from './HistoryPage';
import AcousticVisualization from './AcousticVisualization';

const Dashboard = ({ user, token, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);

  useEffect(() => {
    // Load session history on mount
    loadSessionHistory();
  }, []);

  const loadSessionHistory = async () => {
    try {
      // This would typically fetch from an API
      // For now, we'll use localStorage
      const history = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
      setSessionHistory(history);
    } catch (error) {
      console.error('Error loading session history:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('token_type');
    onLogout();
  };

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'interview', name: 'Interview', icon: MessageSquare },
    { id: 'history', name: 'History', icon: History },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  const Sidebar = () => (
    <div style={{
      width: '280px',
      background: 'white',
      borderRight: '1px solid #e2e8f0',
      height: '100vh',
      position: 'fixed',
      left: sidebarOpen ? '0' : '-280px',
      top: '0',
      transition: 'left 0.3s ease',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BarChart3 style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', margin: 0 }}>
            Face2Phrase
          </h2>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#666',
            display: window.innerWidth <= 768 ? 'block' : 'none'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '20px 0' }}>
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              style={{
                width: '100%',
                padding: '12px 20px',
                border: 'none',
                background: isActive ? '#f8fafc' : 'transparent',
                color: isActive ? '#667eea' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '16px',
                cursor: 'pointer',
                borderRight: isActive ? '3px solid #667eea' : '3px solid transparent',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.target.style.background = '#f1f5f9';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              <Icon size={20} />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* User Info */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid #e2e8f0',
        background: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <User style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
              {user.full_name}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              @{user.username}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#dc2626'}
          onMouseLeave={(e) => e.target.style.background = '#ef4444'}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );

  const Header = () => (
    <header style={{
      background: 'white',
      borderBottom: '1px solid #e2e8f0',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#666',
            display: window.innerWidth <= 768 ? 'block' : 'none'
          }}
        >
          <Menu size={24} />
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', margin: 0 }}>
          {navigation.find(nav => nav.id === activeTab)?.name || 'Dashboard'}
        </h1>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Welcome back, {user.full_name}
        </div>
      </div>
    </header>
  );

  const DashboardContent = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
          Welcome to Face2Phrase
        </h2>
        <p style={{ color: '#666', fontSize: '16px' }}>
          AI-powered interview assistant with acoustic analysis and modern interface
        </p>
      </div>

      {/* Feature Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageSquare style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', margin: 0 }}>
              Smart Interviews
            </h3>
          </div>
          <p style={{ color: '#666', marginBottom: '16px' }}>
            AI-generated questions tailored to your job description and experience level.
          </p>
          <button
            onClick={() => setActiveTab('interview')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Start Interview
          </button>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BarChart3 style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', margin: 0 }}>
              Acoustic Analysis
            </h3>
          </div>
          <p style={{ color: '#666', marginBottom: '16px' }}>
            Real-time voice analysis with pitch, energy, and spectral feature visualization.
          </p>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            View Analysis
          </button>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <History style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', margin: 0 }}>
              Session History
            </h3>
          </div>
          <p style={{ color: '#666', marginBottom: '16px' }}>
            Review past interviews, export reports, and track your progress over time.
          </p>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            View History
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      {sessionHistory.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>
            Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sessionHistory.slice(0, 3).map((session, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    {session.position || 'Interview Session'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(session.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}>
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'interview':
        return <InterviewInterface user={user} token={token} onSessionComplete={loadSessionHistory} />;
      case 'history':
        return <HistoryPage user={user} token={token} sessionHistory={sessionHistory} />;
      case 'settings':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>
              Settings
            </h2>
            <p style={{ color: '#666' }}>Settings panel coming soon...</p>
          </div>
        );
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <Sidebar />
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
            display: window.innerWidth <= 768 ? 'block' : 'none'
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div style={{
        flex: 1,
        marginLeft: window.innerWidth > 768 ? '280px' : '0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Header />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
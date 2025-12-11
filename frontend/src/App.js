import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import ModernInterviewInterface from './components/ModernInterviewInterface';
import { isAuthenticated, getCurrentUser } from './utils/auth';

const App = () => {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already authenticated
    if (isAuthenticated()) {
      const currentUser = getCurrentUser();
      setUser(currentUser);
      setCurrentView('dashboard');
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
  };

  const handleStartInterview = () => {
    setCurrentView('interview');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  return (
    <div className="App">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          },
        }}
      />
      
      {currentView === 'login' && (
        <LoginPage onLogin={handleLogin} />
      )}
      
      {currentView === 'dashboard' && (
        <Dashboard 
          onLogout={handleLogout} 
          onStartInterview={handleStartInterview}
        />
      )}
      
      {currentView === 'interview' && (
        <ModernInterviewInterface 
          onBackToDashboard={handleBackToDashboard}
        />
      )}
    </div>
  );
};

export default App;
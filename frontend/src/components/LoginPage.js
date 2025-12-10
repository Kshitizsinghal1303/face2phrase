import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';

const LoginPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { username: formData.username, password: formData.password }
        : formData;

      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      if (isLogin) {
        // Store token and user info
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('token_type', data.token_type);
        
        // Get user info
        const userResponse = await fetch('http://localhost:8000/api/auth/me', {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        const userData = await userResponse.json();
        
        onLogin(userData, data.access_token);
      } else {
        // Registration successful, switch to login
        setIsLogin(true);
        setFormData({ username: '', password: '', full_name: '', email: '' });
        setError('Registration successful! Please login.');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        padding: '40px',
        width: '100%',
        maxWidth: '400px'
      }}>
        {/* Logo and Title */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto'
          }}>
            <User style={{ width: '40px', height: '40px', color: 'white' }} />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0 0 10px 0' }}>
            Face2Phrase
          </h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: error.includes('successful') ? '#d4edda' : '#f8d7da',
            color: error.includes('successful') ? '#155724' : '#721c24',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!isLogin && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required={!isLogin}
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
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required={!isLogin}
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
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '14px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '16px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
              placeholder="Enter your username"
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '14px 50px 14px 14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                placeholder="Enter your password"
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#cbd5e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '16px',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: 'bold',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s'
            }}
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                {isLogin ? 'Login' : 'Register'}
              </>
            )}
          </button>
        </form>

        {/* Switch between login and register */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setFormData({ username: '', password: '', full_name: '', email: '' });
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>

        {/* Demo credentials hint */}
        {isLogin && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#666',
            textAlign: 'center'
          }}>
            <strong>Demo credentials:</strong><br />
            Username: demo | Password: demo123
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
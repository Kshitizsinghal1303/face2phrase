// Local authentication utilities
const AUTH_KEY = 'face2phrase_auth';
const USERS_KEY = 'face2phrase_users';

// Initialize default admin user if no users exist
const initializeDefaultUser = () => {
  const users = getUsers();
  if (users.length === 0) {
    const defaultUser = {
      id: '1',
      username: 'admin',
      password: 'admin123', // In a real app, this would be hashed
      email: 'admin@face2phrase.com',
      fullName: 'Administrator',
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    saveUser(defaultUser);
  }
};

// Get all users from localStorage
export const getUsers = () => {
  try {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

// Save user to localStorage
export const saveUser = (user) => {
  try {
    const users = getUsers();
    const existingIndex = users.findIndex(u => u.id === user.id);
    
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
};

// Register new user
export const registerUser = (userData) => {
  try {
    const users = getUsers();
    
    // Check if username already exists
    if (users.find(u => u.username === userData.username)) {
      throw new Error('Username already exists');
    }
    
    // Check if email already exists
    if (users.find(u => u.email === userData.email)) {
      throw new Error('Email already exists');
    }
    
    const newUser = {
      id: Date.now().toString(),
      username: userData.username,
      password: userData.password, // In a real app, this would be hashed
      email: userData.email,
      fullName: userData.fullName,
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    
    saveUser(newUser);
    return { success: true, user: newUser };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Login user
export const loginUser = (username, password) => {
  try {
    initializeDefaultUser();
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      // Update last login
      user.lastLogin = new Date().toISOString();
      saveUser(user);
      
      // Save auth session
      const authData = {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        },
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };
      
      localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
      return { success: true, user: authData.user };
    } else {
      return { success: false, error: 'Invalid username or password' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Logout user
export const logoutUser = () => {
  try {
    localStorage.removeItem(AUTH_KEY);
    return true;
  } catch (error) {
    console.error('Error logging out:', error);
    return false;
  }
};

// Get current authenticated user
export const getCurrentUser = () => {
  try {
    const authData = localStorage.getItem(AUTH_KEY);
    if (!authData) return null;
    
    const parsed = JSON.parse(authData);
    const now = new Date();
    const expiresAt = new Date(parsed.expiresAt);
    
    // Check if session is expired
    if (now > expiresAt) {
      logoutUser();
      return null;
    }
    
    return parsed.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    logoutUser();
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return getCurrentUser() !== null;
};

// Update user profile
export const updateUserProfile = (updates) => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    
    if (userIndex >= 0) {
      users[userIndex] = { ...users[userIndex], ...updates };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      
      // Update auth session
      const authData = JSON.parse(localStorage.getItem(AUTH_KEY));
      authData.user = { ...authData.user, ...updates };
      localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
      
      return { success: true, user: authData.user };
    }
    
    return { success: false, error: 'User not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Initialize auth system
initializeDefaultUser();
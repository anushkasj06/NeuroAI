import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await auth.getMe();
      if (response.data.status === 'success') {
        setUser(response.data.data.user);
      }
    } catch (err) {
      setUser(null);
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setError(null);
      const response = await auth.login(credentials);
      if (response.data.status === 'success') {
        setUser(response.data.data.user);
        return response.data;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };

  const signup = async (userData) => {
    try {
      setError(null);
      const response = await auth.signup(userData);
      if (response.data.status === 'success') {
        setUser(response.data.data.user);
        return response.data;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await auth.logout();
      setUser(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Logout failed');
      console.error('Logout error:', err);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
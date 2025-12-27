import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('richgang_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await axios.post(`${API}/auth/verify`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser({ role: response.data.role, name: response.data.name });
        } catch (error) {
          localStorage.removeItem('richgang_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    
    verifyToken();
  }, [token]);

  const login = async (code) => {
    const response = await axios.post(`${API}/auth/login`, { code });
    const { token: newToken, role, name } = response.data;
    
    localStorage.setItem('richgang_token', newToken);
    setToken(newToken);
    setUser({ role, name });
    
    return { role, name };
  };

  const logout = () => {
    localStorage.removeItem('richgang_token');
    setToken(null);
    setUser(null);
  };

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    getAuthHeader
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

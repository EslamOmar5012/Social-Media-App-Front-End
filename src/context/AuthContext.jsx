import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken') || null);
  const [loading, setLoading] = useState(true);

  const logoutLocal = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  const fetchProfile = useCallback(async (currentToken) => {
    try {
      const response = await api.get('/user/profile', {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });
      if (response.data && response.data.data) {
        const profileUser = response.data.data.user;
        setUser(profileUser);
        localStorage.setItem('user', JSON.stringify(profileUser));
      }
    } catch (error) {
      console.error('[AuthContext] Failed to load profile:', error);
      // Clean up token if invalid
      logoutLocal();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      setToken(storedToken);
      fetchProfile(storedToken);
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  const signup = async (payload) => {
    const response = await api.post('/auth/signup', payload);
    return response.data;
  };

  const confirmEmail = async (email, otp) => {
    const response = await api.post('/auth/confirm-email', { email, otp });
    return response.data;
  };

  const resendConfirmEmail = async (email) => {
    const response = await api.post('/auth/resend-confirm-email', { email });
    return response.data;
  };

  const login = async (email, password, fcmToken = null) => {
    const payload = { email, password };
    if (fcmToken) {
      payload.fcmToken = fcmToken;
    }
    const response = await api.post('/auth/login', payload);
    const { accessToken, refreshToken, user: loggedUser } = response.data.data;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (loggedUser) {
      localStorage.setItem('user', JSON.stringify(loggedUser));
      setUser(loggedUser);
    }
    setToken(accessToken);
    
    // Fetch latest profile details
    await fetchProfile(accessToken);
    return response.data;
  };

  const forgotPassword = async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  };

  const resetPassword = async (email, otp, newPassword, confirmPassword) => {
    const response = await api.patch('/auth/reset-password', { email, otp, newPassword, confirmPassword });
    return response.data;
  };


  const logout = async (email) => {
    try {
      await api.patch('/auth/logout', { email });
    } catch (error) {
      console.error('[AuthContext] Backend logout failed:', error);
    } finally {
      logoutLocal();
    }
  };

  const updateProfileLocal = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    token,
    loading,
    signup,
    confirmEmail,
    resendConfirmEmail,
    login,
    forgotPassword,
    resetPassword,
    logout,
    updateProfileLocal,
    fetchProfile: () => fetchProfile(token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;

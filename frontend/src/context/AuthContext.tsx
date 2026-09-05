import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, AuthResponse } from '../types';
import { getMeApi, loginApi, signupApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    role?: string,
    department?: string,
    experience_years?: number
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserState: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('statskill_token'));
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('statskill_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on initial mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('statskill_token');
      if (storedToken) {
        try {
          const profile = await getMeApi();
          setUser(profile);
          localStorage.setItem('statskill_user', JSON.stringify(profile));
        } catch (error) {
          console.warn('Stored token was invalid or expired:', error);
          localStorage.removeItem('statskill_token');
          localStorage.removeItem('statskill_user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const handleAuthSuccess = async (authData: AuthResponse) => {
    localStorage.setItem('statskill_token', authData.access_token);
    setToken(authData.access_token);

    try {
      const profile = await getMeApi();
      setUser(profile);
      localStorage.setItem('statskill_user', JSON.stringify(profile));
    } catch {
      // Fallback user object from token metadata if /me delayed
      const fallbackUser: User = {
        id: authData.user_id,
        name: authData.name,
        email: '',
        role: authData.role,
        department: 'MoSPI',
        experience_years: 1,
      };
      setUser(fallbackUser);
      localStorage.setItem('statskill_user', JSON.stringify(fallbackUser));
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await loginApi({ email, password });
      await handleAuthSuccess(res);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    role?: string,
    department?: string,
    experience_years?: number
  ) => {
    setIsLoading(true);
    try {
      const res = await signupApi({ name, email, password, role, department, experience_years });
      await handleAuthSuccess(res);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('statskill_token');
    localStorage.removeItem('statskill_user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const profile = await getMeApi();
      setUser(profile);
      localStorage.setItem('statskill_user', JSON.stringify(profile));
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  const updateUserState = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('statskill_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
        updateUserState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

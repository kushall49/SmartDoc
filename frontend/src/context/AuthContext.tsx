import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getToken, setToken, removeToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokenState, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check auth session on initial load
  useEffect(() => {
    async function loadUser() {
      const storedToken = getToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get<{ success: boolean; user: User }>('/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          removeToken();
          setTokenState(null);
        }
      } catch (err) {
        removeToken();
        setTokenState(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ success: boolean; token: string; user: User }>('/auth/login', {
        email,
        password,
      });
      if (res.success && res.token) {
        setToken(res.token);
        setTokenState(res.token);
        setUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ success: boolean; token: string; user: User }>('/auth/register', {
        name,
        email,
        password,
      });
      if (res.success && res.token) {
        setToken(res.token);
        setTokenState(res.token);
        setUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout network errors
    } finally {
      removeToken();
      setTokenState(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token: tokenState,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


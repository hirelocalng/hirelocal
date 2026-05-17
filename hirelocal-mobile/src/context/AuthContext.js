import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { getToken, setToken, getProvider, setProvider, clearAuth } from '../utils/storage';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [provider, setProviderState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await getToken();
      if (!token) return;
      const { data } = await api.getMe();
      if (data.success) {
        setProviderState(data.provider);
        await setProvider(data.provider);
      } else {
        // Server explicitly rejected the token — clear it
        await clearAuth();
      }
    } catch {
      // Network error — restore from cache so offline users stay logged in
      const cached = await getProvider();
      if (cached) setProviderState(cached);
    } finally {
      setLoading(false);
    }
  }

  async function login(token, providerData) {
    await setToken(token);
    await setProvider(providerData);
    setProviderState(providerData);
  }

  async function logout() {
    await clearAuth();
    setProviderState(null);
  }

  async function updateProvider(providerData) {
    await setProvider(providerData);
    setProviderState(providerData);
  }

  return (
    <AuthContext.Provider value={{ provider, loading, login, logout, updateProvider }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

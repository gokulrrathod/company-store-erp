import { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await SecureStore.getItemAsync('vmg_user');
      if (raw) setUser(JSON.parse(raw));
      setReady(true);
    })();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('vmg_token', data.token);
    await SecureStore.setItemAsync('vmg_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('vmg_token');
    await SecureStore.deleteItemAsync('vmg_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

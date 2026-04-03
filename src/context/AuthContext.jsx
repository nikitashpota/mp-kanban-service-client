import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved  = localStorage.getItem('user');
    if (token && saved) {
      try {
        setUser(JSON.parse(saved));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch {}
    }
    setLoading(false);
  }, []);

  function signIn(token, userData) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  }

  const role       = user?.role || 'viewer';
  const isAdmin    = role === 'admin';
  const isPM       = role === 'pm'  || isAdmin;
  const isGIP      = role === 'gip' || isPM;
  const canEdit    = isGIP;
  const canApprove = isPM;

  return (
    <AuthContext.Provider value={{ user, signIn, logout, signOut: logout, loading, role, isAdmin, isPM, isGIP, canEdit, canApprove }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

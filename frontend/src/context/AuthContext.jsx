import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AuthContext } from './auth-context';
import { DEMO_ONLY } from '../config';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !DEMO_ONLY && Boolean(localStorage.getItem('token')));

  useEffect(() => {
    let active = true;
    if (!DEMO_ONLY && localStorage.getItem('token')) {
      api.me().then((data) => {
        if (active) setUser(data);
      }).catch((error) => {
        if (error.status === 401 || error.status === 403) localStorage.removeItem('token');
      }).finally(() => {
        if (active) setLoading(false);
      });
    }
    const expire = () => {
      localStorage.removeItem('token');
      setUser(null);
    };
    window.addEventListener('auth:expired', expire);
    return () => {
      active = false;
      window.removeEventListener('auth:expired', expire);
    };
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('token', data.access_token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (name, email, password) => {
    const data = await api.signup({ name, email, password });
    localStorage.setItem('token', data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

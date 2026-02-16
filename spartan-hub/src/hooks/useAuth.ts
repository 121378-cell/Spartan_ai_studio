import { useState, useEffect } from 'react';
import { AuthState, User } from '../utils/auth';

const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    const res = await fetch('/api/csrf-token', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.csrfToken ?? null;
  } catch {
    return null;
  }
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({ token: null, user: null });
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/auth/me', {
        credentials: 'include' // Include cookies
      });
      if (response.ok) {
        const data = await response.json();
        setAuthState({ token: 'authenticated', user: data.user });
      } else {
        setAuthState({ token: null, user: null });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({ token: null, user: null });
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const csrfToken = await fetchCsrfToken();
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({ token: 'authenticated', user: data.user });
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      const csrfToken = await fetchCsrfToken();
      await fetch('/auth/logout', {
        method: 'POST',
        headers: {
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
        credentials: 'include', // Include cookies
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setAuthState({ token: null, user: null });
  };

  return {
    token: authState.token,
    user: authState.user,
    loading,
    login,
    logout,
    checkAuthStatus,
  };
};

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
  registerRequest,
} from '../services/auth';
import { parseApiError } from '../utils/authErrors';
import {
  clearAuthStorage,
  getRoleRedirectPath,
  getStoredToken,
  getStoredUser,
  setAuthStorage,
} from '../utils/storage';

export const AuthContext = createContext(null);

function wrapAuthError(err) {
  const { code, message } = parseApiError(err);
  const authError = new Error(message);
  authError.code = code;
  throw authError;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!getStoredToken();

  const login = useCallback(async (email, password) => {
    try {
      const { accessToken, user: loggedInUser } = await loginRequest(email, password);
      setAuthStorage(accessToken, loggedInUser);
      setUser(loggedInUser);
      return getRoleRedirectPath(loggedInUser.role);
    } catch (err) {
      wrapAuthError(err);
    }
  }, []);

  const register = useCallback(async (payload) => {
    try {
      const { accessToken, user: newUser } = await registerRequest(payload);
      setAuthStorage(accessToken, newUser);
      setUser(newUser);
      return getRoleRedirectPath(newUser.role);
    } catch (err) {
      wrapAuthError(err);
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    clearAuthStorage();
    setUser(null);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
        setAuthStorage(token, currentUser);
      } catch {
        clearAuthStorage();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isAuthenticated, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

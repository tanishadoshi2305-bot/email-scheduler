import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  authApi,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
  setUnauthorizedHandler,
} from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(() => Boolean(getStoredToken()));

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    let active = true;

    async function hydrateSession() {
      const existingToken = getStoredToken();
      if (!existingToken) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        const data = await authApi.me();
        if (active) {
          setUser(data.user);
          setToken(existingToken);
        }
      } catch {
        if (active) {
          clearStoredToken();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    hydrateSession();
    return () => {
      active = false;
    };
  }, []);

  const applyAuthSession = useCallback((data) => {
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login({ email, password });
      return applyAuthSession(data);
    },
    [applyAuthSession]
  );

  const register = useCallback(
    async (name, email, password) => {
      const data = await authApi.register({ name, email, password });
      return applyAuthSession(data);
    },
    [applyAuthSession]
  );

  const demoLogin = useCallback(async () => {
    const data = await authApi.login({
      email: "demo@dispatch.app",
      password: "password123",
    });
    return applyAuthSession(data);
  }, [applyAuthSession]);

  const googleLogin = useCallback(
    async (payload) => {
      const data = await authApi.googleLogin(payload);
      return applyAuthSession(data);
    },
    [applyAuthSession]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        login,
        register,
        demoLogin,
        googleLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { apiFetch } from "@/lib/api";
import { AuthUser, ApiResponse } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "pageant_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }

    setToken(stored);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    apiFetch<ApiResponse<AuthUser>>("/api/auth/me", { signal: controller.signal }, stored)
      .then((res) => {
        if (res.success && res.data) {
          setUser(res.data);
        } else {
          sessionStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
      })
      .catch(() => {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiFetch<
      ApiResponse<{ user: AuthUser; token: string }>
    >("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    if (!res.success || !res.data) {
      throw new Error(res.error ?? "Login failed");
    }

    sessionStorage.setItem(TOKEN_KEY, res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" }, token);
    } finally {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }, [token]);

  const value = useMemo(
    () => ({ user, token, isLoading, login, logout }),
    [user, token, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

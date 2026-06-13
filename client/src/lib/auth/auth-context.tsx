"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, login as loginApi } from "@/lib/api/auth";
import { clearAuthToken, setAuthToken } from "@/lib/api/client";
import type { AuthUser, LoginInput } from "@/lib/types";

const TOKEN_KEY = "shj_auth_token";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    setAuthToken(token);
    try {
      const current = await fetchCurrentUser();
      setUser(current);
    } catch {
      clearAuthToken();
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (input: LoginInput) => {
      const { token, user: loggedIn } = await loginApi(input);
      localStorage.setItem(TOKEN_KEY, token);
      setAuthToken(token);
      setUser(loggedIn);
      router.replace("/dashboard");
    },
    [router],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    clearAuthToken();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

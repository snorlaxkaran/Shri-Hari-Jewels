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
import { login as loginApi } from "@/lib/api/auth";
import { clearAuthToken, setAuthToken } from "@/lib/api/client";
import type { AuthUser, LoginInput } from "@/lib/types";

const TOKEN_KEY = "shj_auth_token";

const getAuthStorage = () =>
  typeof window !== "undefined" ? window.sessionStorage : null;

// Decode JWT payload without a library (browser-safe, no network needed)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getUserFromToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  // Check expiry
  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  if (exp * 1000 < Date.now()) return null;

  const { sub, email, name, role, organizationId, organizationName } = payload as {
    sub?: string;
    email?: string;
    name?: string;
    role?: string;
    organizationId?: string;
    organizationName?: string;
  };

  if (!sub || !email || !name || !role) return null;

  return {
    id: sub,
    email,
    name,
    role: role as AuthUser["role"],
    organizationId,
    organizationName,
  };
}

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

  const bootstrap = useCallback(() => {
    const storage = getAuthStorage();
    const token = storage?.getItem(TOKEN_KEY) ?? null;

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
    }

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Decode JWT locally — zero network cost, instant
    const decoded = getUserFromToken(token);
    if (!decoded) {
      // Token missing or expired — clear it and send to login
      storage?.removeItem(TOKEN_KEY);
      clearAuthToken();
      setUser(null);
      setLoading(false);
      return;
    }

    setAuthToken(token);
    setUser(decoded);
    setLoading(false);
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (input: LoginInput) => {
      const { token, user: loggedIn } = await loginApi(input);
      getAuthStorage()?.setItem(TOKEN_KEY, token);
      setAuthToken(token);
      setUser(loggedIn);
      router.replace(loggedIn.role === "SuperAdmin" ? "/platform/companies" : "/dashboard");
    },
    [router],
  );

  const logout = useCallback(() => {
    getAuthStorage()?.removeItem(TOKEN_KEY);
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

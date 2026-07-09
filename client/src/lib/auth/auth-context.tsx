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
import {
  login as loginApi,
  logoutApi,
  refreshSession,
  verify2fa,
  type LoginResponse,
} from "@/lib/api/auth";
import { clearAuthToken, setAuthToken } from "@/lib/api/client";
import type { AuthUser, LoginInput } from "@/lib/types";

const TOKEN_KEY = "shj_auth_token";
const REFRESH_TOKEN_KEY = "shj_refresh_token";

const getAuthStorage = () =>
  typeof window !== "undefined" ? window.sessionStorage : null;

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
  login: (input: LoginInput) => Promise<LoginResponse>;
  verify2FA: (tempToken: string, code: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const persistSession = (token: string, refreshToken?: string) => {
  const storage = getAuthStorage();
  storage?.setItem(TOKEN_KEY, token);
  if (refreshToken) {
    storage?.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  setAuthToken(token);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const storage = getAuthStorage();
    const token = storage?.getItem(TOKEN_KEY) ?? null;
    const refreshToken = storage?.getItem(REFRESH_TOKEN_KEY) ?? null;

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
    }

    if (!token && !refreshToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (token) {
      const decoded = getUserFromToken(token);
      if (decoded) {
        setAuthToken(token);
        setUser(decoded);
        setLoading(false);
        return;
      }
    }

    if (refreshToken) {
      try {
        const result = await refreshSession(refreshToken);
        persistSession(result.token, result.refreshToken);
        setUser(result.user);
        setLoading(false);
        return;
      } catch {
        storage?.removeItem(TOKEN_KEY);
        storage?.removeItem(REFRESH_TOKEN_KEY);
        clearAuthToken();
      }
    }

    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const completeLogin = useCallback(
    (token: string, refreshToken: string, loggedIn: AuthUser) => {
      persistSession(token, refreshToken);
      setUser(loggedIn);
      router.replace(
        loggedIn.role === "SuperAdmin" ? "/platform/companies" : "/dashboard",
      );
    },
    [router],
  );

  const login = useCallback(
    async (input: LoginInput): Promise<LoginResponse> => {
      const result = await loginApi(input);
      if ("requires2FA" in result && result.requires2FA) {
        return result;
      }
      if ("token" in result) {
        completeLogin(result.token, result.refreshToken, result.user);
      }
      return result;
    },
    [completeLogin],
  );

  const verify2FA = useCallback(
    async (tempToken: string, code: string) => {
      const result = await verify2fa(tempToken, code);
      completeLogin(result.token, result.refreshToken, result.user);
    },
    [completeLogin],
  );

  const logout = useCallback(() => {
    const storage = getAuthStorage();
    const refreshToken = storage?.getItem(REFRESH_TOKEN_KEY) ?? undefined;
    void logoutApi(refreshToken);
    storage?.removeItem(TOKEN_KEY);
    storage?.removeItem(REFRESH_TOKEN_KEY);
    clearAuthToken();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, verify2FA, logout }),
    [user, loading, login, verify2FA, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

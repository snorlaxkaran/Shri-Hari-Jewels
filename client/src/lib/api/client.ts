import axios, { isAxiosError } from "axios";

const PRODUCTION_API_BASE_URL = "https://shri-hari-jewels-api.onrender.com";
const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? PRODUCTION_API_BASE_URL
    : "http://localhost:4000";
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
const configuredApiIsLocal =
  configuredApiBaseUrl?.includes("localhost") ||
  configuredApiBaseUrl?.includes("127.0.0.1");

export const API_BASE_URL =
  process.env.NODE_ENV === "production" && configuredApiIsLocal
    ? PRODUCTION_API_BASE_URL
    : configuredApiBaseUrl ?? DEFAULT_API_BASE_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15s timeout — prevent infinite skeleton if server is dead
  headers: { "Content-Type": "application/json" },
});

export const setAuthToken = (token: string) => {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const clearAuthToken = () => {
  delete api.defaults.headers.common.Authorization;
};

export const getAuthToken = (): string => {
  if (typeof window === "undefined") return "";
  return (
    window.sessionStorage.getItem("shj_auth_token") ??
    window.localStorage.getItem("shj_auth_token") ??
    ""
  );
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const onLoginPage = window.location.pathname === "/login";
      if (!onLoginPage) {
        window.sessionStorage.removeItem("shj_auth_token");
        window.localStorage.removeItem("shj_auth_token");
        clearAuthToken();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Failed to save product. Please try again.",
): string => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.error;
    if (typeof message === "string") return message;
    if (error.response?.status === 404) {
      return "API route not found. Restart or redeploy the backend server (Render → Manual Deploy).";
    }
    if (!error.response) {
      return "Could not connect to the server. Start the backend locally (cd server && npm run dev) or check NEXT_PUBLIC_API_URL.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

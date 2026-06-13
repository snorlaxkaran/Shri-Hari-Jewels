import axios, { isAxiosError } from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const setAuthToken = (token: string) => {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const clearAuthToken = () => {
  delete api.defaults.headers.common.Authorization;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const onLoginPage = window.location.pathname === "/login";
      if (!onLoginPage) {
        localStorage.removeItem("shj_auth_token");
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
    if (!error.response) {
      return "Could not connect to the server. Is the backend running?";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

import axios from "axios";
import * as SecureStore from "expo-secure-store";

export const ACCESS_TOKEN_KEY = "access_token";
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

export const apiClient = axios.create({ baseURL: BASE_URL, timeout: 15_000 });

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      import("@/features/auth/store")
        .then(({ useAuthStore }) => useAuthStore.getState().logout())
        .catch(() => {});
    }
    return Promise.reject(err);
  }
);

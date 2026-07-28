import axios from "axios";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

export const ACCESS_TOKEN_KEY = "access_token";
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

export const apiClient = axios.create({ baseURL: BASE_URL, timeout: 15_000 });

let unauthorizedCleanup: Promise<void> | null = null;

function isAuthRequest(url?: string) {
  return /\/v1\/auth(?:\/|$)/.test(url ?? "");
}

async function handleUnauthorized() {
  if (unauthorizedCleanup) return unauthorizedCleanup;

  unauthorizedCleanup = import("@/features/auth/store")
    .then(async ({ useAuthStore }) => {
      const auth = useAuthStore.getState();
      if (auth.sessionStatus !== "unauthenticated") await auth.logout();
    })
    .then(() => {
      router.replace("/(auth)/login");
    })
    .finally(() => {
      unauthorizedCleanup = null;
    });

  return unauthorizedCleanup;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !isAuthRequest(err.config?.url)) {
      await handleUnauthorized().catch(() => {
        // Navigation still belongs here even if a storage implementation
        // reports an error while clearing the expired session.
        router.replace("/(auth)/login");
      });
    }
    return Promise.reject(err);
  }
);

import axios from "axios";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

declare module "axios" {
  export interface AxiosRequestConfig {
    _retriedForColdStart?: boolean;
  }
}

export const ACCESS_TOKEN_KEY = "access_token";
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

// Render's free tier spins the backend down after ~15 min idle; the next request
// can take 30-60s+ to wake it. The default timeout below covers a warm backend -
// a request that times out gets one retry at COLD_START_RETRY_TIMEOUT_MS before
// surfacing an error, so a cold start doesn't look like a dead connection.
const COLD_START_RETRY_TIMEOUT_MS = 45_000;

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

function isTimeout(err: unknown) {
  return axios.isAxiosError(err) && (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT");
}

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

    const config = err.config;
    if (isTimeout(err) && config && !config._retriedForColdStart) {
      config._retriedForColdStart = true;
      config.timeout = COLD_START_RETRY_TIMEOUT_MS;
      return apiClient(config);
    }

    return Promise.reject(err);
  }
);

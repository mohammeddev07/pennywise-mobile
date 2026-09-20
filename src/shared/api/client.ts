import axios from "axios";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { AppState, type AppStateStatus } from "react-native";

import { mockAdapter } from "@/shared/api/mockAdapter";

declare module "axios" {
  export interface AxiosRequestConfig {
    _retriedForColdStart?: boolean;
    _coldStartCandidate?: boolean;
  }
}

export const ACCESS_TOKEN_KEY = "access_token";
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";
export const USE_MOCK_API = process.env.EXPO_PUBLIC_MOCK_API === "true";

// Render's free tier spins the backend down after ~15 min idle; the next request
// can take 30-60s+ to wake it. The default timeout below covers a warm backend -
// a request that times out gets one retry at COLD_START_RETRY_TIMEOUT_MS before
// surfacing an error, so a cold start doesn't look like a dead connection.
const COLD_START_RETRY_TIMEOUT_MS = 45_000;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  ...(USE_MOCK_API ? { adapter: mockAdapter } : {}),
});

// App launch and every foreground resume may hit a backend that just spun down -
// only the next request gets the cold-start retry ladder below; everything else
// fails fast so a genuinely dead connection doesn't also pay the 60s tax.
let coldStartCandidate = true;
AppState.addEventListener("change", (state: AppStateStatus) => {
  if (state === "active") coldStartCandidate = true;
});

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
  if (coldStartCandidate) {
    config._coldStartCandidate = true;
    coldStartCandidate = false;
  }
  return config;
});

export function isTimeout(err: unknown) {
  return axios.isAxiosError(err) && (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT");
}

// A timeout/network failure means "don't know," not "logged out" - only a real
// 401/403 from the server means the token is actually invalid.
export function isAuthError(err: unknown) {
  return axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403);
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
    if (isTimeout(err) && config && config._coldStartCandidate && !config._retriedForColdStart) {
      config._retriedForColdStart = true;
      config.timeout = COLD_START_RETRY_TIMEOUT_MS;
      return apiClient(config);
    }

    return Promise.reject(err);
  }
);

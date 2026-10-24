import { beginBookOperation, endBookOperation } from '@/features/books/operations';
import axios from "axios";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { AppState, type AppStateStatus } from "react-native";

declare module "axios" {
  export interface AxiosRequestConfig {
    _skipColdStartTimeout?: boolean;
    _bookOperation?: number;
  }
}

export const ACCESS_TOKEN_KEY = "access_token";
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";
export const USE_MOCK_API = process.env.EXPO_PUBLIC_MOCK_API === "true";

// A cold backend may need the entire startup wait budget. Keep one request alive
// instead of replaying timed-out reads, logins, or writes while it may still run.
const WARM_TIMEOUT_MS = 15_000;
const COLD_START_TIMEOUT_MS = 60_000;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: WARM_TIMEOUT_MS,
  // Required lazily: with EXPO_PUBLIC_MOCK_API unset the constant folds to false and the bundler drops the
  // whole in-memory backend (seed data, fake token) from a release bundle.
  ...(USE_MOCK_API ? { adapter: require("@/shared/api/mockAdapter").mockAdapter } : {}),
});

// App launch and every foreground resume may hit a backend that just spun down -
// the first request after launch/resume (however late it fires) plus every request
// in the first few seconds (the parallel launch burst) gets the longer timeout.
// Later requests use the warm timeout. No transport failure replays an operation.
const COLD_START_WINDOW_MS = 3_000;
let coldStartCandidate = true;
let coldStartUntil = Date.now() + COLD_START_WINDOW_MS;
export function openColdStartWindow() {
  coldStartUntil = Date.now() + COLD_START_WINDOW_MS;
}
AppState.addEventListener("change", (state: AppStateStatus) => {
  if (state === "active") {
    coldStartCandidate = true;
    openColdStartWindow();
  }
});

let unauthorizedCleanup: Promise<void> | null = null;

function isPublicAuthRequest(url?: string) {
  return /\/v1\/auth\/(?:login|signup|google)\/?(?:[?#]|$)/.test(url ?? "");
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
  const bookWrite = /\/v1\/books(?:\/|$)/.test(config.url ?? '') && !['get', 'head'].includes(config.method ?? 'get') && !/\/(search|analyze)$/.test(config.url ?? '');
  if (bookWrite && config._bookOperation === undefined) config._bookOperation = beginBookOperation();
  let token: string | null;
  try { token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY); }
  catch (error) { endBookOperation(config._bookOperation); throw error; }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (coldStartCandidate || Date.now() < coldStartUntil) {
    coldStartCandidate = false;
    if (!config._skipColdStartTimeout && config.timeout === WARM_TIMEOUT_MS) {
      config.timeout = COLD_START_TIMEOUT_MS;
    }
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
  (res) => { endBookOperation(res.config._bookOperation); return res; },
  async (err) => {
    if (err.response?.status === 401 && !isPublicAuthRequest(err.config?.url)) {
      await handleUnauthorized().catch(() => {
        // Navigation still belongs here even if a storage implementation
        // reports an error while clearing the expired session.
        router.replace("/(auth)/login");
      });
    }

    endBookOperation(err.config?._bookOperation);
    return Promise.reject(err);
  }
);

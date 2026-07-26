import axios from "axios";

import type { ApiErrorResponse } from "@/shared/types/api";

export function getApiErrorCode(error: unknown) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) return undefined;
  return error.response?.data?.error;
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    if (!error.response) return "Can't connect to server. Check your internet connection.";
    return error.response.data?.message || fallback;
  }
  return fallback;
}

export function getAuthErrorMessage(error: unknown) {
  const code = getApiErrorCode(error);
  if (code === "INVALID_CREDENTIALS") return "Incorrect email or password";
  if (code === "EMAIL_ALREADY_REGISTERED") return "An account with this email already exists";
  return getApiErrorMessage(error);
}

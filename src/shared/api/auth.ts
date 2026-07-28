import { apiClient } from "@/shared/api/client";
import type { AuthResponse, MeResponse, MeUpdateRequest } from "@/shared/types/api";

export async function signup(email: string, password: string, defaultCurrencyCode?: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/v1/auth/signup", {
    email,
    password,
    defaultCurrencyCode,
  });
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/v1/auth/login", { email, password });
  return data;
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>("/v1/me");
  return data;
}

export async function updateMe(patch: MeUpdateRequest): Promise<MeResponse> {
  const { data } = await apiClient.patch<MeResponse>("/v1/me", patch);
  return data;
}

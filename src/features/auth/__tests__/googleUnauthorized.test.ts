import { AxiosError, type AxiosAdapter } from "axios";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { apiClient, ACCESS_TOKEN_KEY } from "@/shared/api/client";
import { queryClient } from "@/shared/api/queryClient";
import { useAuthStore } from "../store";

const unauthorized: AxiosAdapter = async (config) => {
  throw new AxiosError("Expired", "ERR_BAD_REQUEST", config, undefined, {
    status: 401, statusText: "Unauthorized", data: {}, headers: {}, config,
  });
};

beforeEach(async () => {
  await useAuthStore.getState().login("test@example.com", "password");
  queryClient.setQueryData(["private-account"], { balance: 42 });
  jest.clearAllMocks();
});
afterEach(() => queryClient.clear());

it("clears an expired session and account cache after a Google link 401", async () => {
  await expect(apiClient.post("/v1/auth/google/link", {}, { adapter: unauthorized })).rejects.toMatchObject({ response: { status: 401 } });
  expect(useAuthStore.getState().sessionStatus).toBe("unauthenticated");
  expect(useAuthStore.getState().user).toBeNull();
  expect(useAuthStore.getState().accessToken).toBeNull();
  expect(queryClient.getQueryData(["private-account"])).toBeUndefined();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(ACCESS_TOKEN_KEY);
  expect(router.replace).toHaveBeenCalledWith("/(auth)/login");
});

it.each(["login", "signup", "google"])("keeps %s public-auth failures out of session cleanup", async (endpoint) => {
  await expect(apiClient.post(`/v1/auth/${endpoint}`, {}, { adapter: unauthorized })).rejects.toMatchObject({ response: { status: 401 } });
  expect(useAuthStore.getState().sessionStatus).toBe("authenticated");
  expect(queryClient.getQueryData(["private-account"])).toEqual({ balance: 42 });
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

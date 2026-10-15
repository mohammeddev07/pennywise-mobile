import { AxiosError, type AxiosAdapter } from "axios";
import { createElement } from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { DataBootstrap } from "@/app/_layout";
import * as authApi from "@/shared/api/auth";
import * as booksApi from "@/shared/api/books";
import { apiClient } from "@/shared/api/client";
import { bumpAccountEpoch } from "@/shared/session/accountEpoch";
import type { MeResponse } from "@/shared/types/api";
import { useAuthStore } from "../store";
import { isTokenExpired } from "../token";

const jwt = (exp: number) => `x.${btoa(JSON.stringify({ exp })).replace(/=+$/, "")}.sig`;
const validToken = () => jwt(Math.floor(Date.now() / 1000) + 3600);
const user = { id: "u1", email: "a@b.co", defaultCurrencyCode: "USD", createdAt: "2026-01-01T00:00:00Z" } as MeResponse;
const fresh = { ...user, email: "fresh@b.co" } as MeResponse;
const httpError = (status: number) =>
  new AxiosError("x", "ERR_BAD_REQUEST", undefined, undefined, { status, statusText: "", data: {}, headers: {}, config: {} as never });

jest.mock("../../../../global.css", () => ({}), { virtual: true });
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname: () => "/",
}));

let getMe: jest.SpyInstance;

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  getMe = jest.spyOn(authApi, "getMe");
  useAuthStore.setState({ accessToken: validToken(), user, sessionStatus: "resolving", unlocked: false });
});
afterEach(() => jest.restoreAllMocks());

const flush = () => new Promise((r) => setTimeout(r, 0));

it("optimistic: persisted user + valid token → authenticated before getMe resolves", () => {
  getMe.mockReturnValue(new Promise(() => {}));
  useAuthStore.getState().restoreSession();
  expect(useAuthStore.getState().sessionStatus).toBe("authenticated");
  expect(useAuthStore.getState().unlocked).toBe(true);
  expect(getMe).toHaveBeenCalledTimes(1);
});

it("background 401 → logout", async () => {
  getMe.mockRejectedValue(httpError(401));
  useAuthStore.getState().restoreSession();
  await waitFor(() => expect(useAuthStore.getState().sessionStatus).toBe("unauthenticated"));
  expect(useAuthStore.getState().user).toBeNull();
});

it("background timeout → stays signed in", async () => {
  getMe.mockRejectedValue(new AxiosError("timeout", "ECONNABORTED"));
  useAuthStore.getState().restoreSession();
  await flush();
  expect(useAuthStore.getState().sessionStatus).toBe("authenticated");
  expect(useAuthStore.getState().user).toBe(user);
});

it("refresh never passes through resolving", async () => {
  useAuthStore.setState({ sessionStatus: "authenticated" });
  const seen: string[] = [];
  const unsub = useAuthStore.subscribe((s) => seen.push(s.sessionStatus));
  getMe.mockResolvedValueOnce(fresh);
  await useAuthStore.getState().refreshSession();
  getMe.mockRejectedValueOnce(new AxiosError("timeout", "ECONNABORTED"));
  await useAuthStore.getState().refreshSession();
  unsub();
  expect(seen).not.toContain("resolving");
  expect(useAuthStore.getState().user).toBe(fresh);
});

it("expired token → unauthenticated, no request", async () => {
  useAuthStore.setState({ accessToken: jwt(Math.floor(Date.now() / 1000) - 10) });
  useAuthStore.getState().restoreSession();
  await waitFor(() => expect(useAuthStore.getState().sessionStatus).toBe("unauthenticated"));
  expect(getMe).not.toHaveBeenCalled();
});

it("no persisted user → unauthenticated, no request", async () => {
  useAuthStore.setState({ user: null });
  useAuthStore.getState().restoreSession();
  await waitFor(() => expect(useAuthStore.getState().sessionStatus).toBe("unauthenticated"));
  expect(getMe).not.toHaveBeenCalled();
});

it("refresh result from a previous account is dropped", async () => {
  let resolve!: (u: MeResponse) => void;
  getMe.mockReturnValue(new Promise<MeResponse>((r) => (resolve = r)));
  useAuthStore.setState({ sessionStatus: "authenticated" });
  const p = useAuthStore.getState().refreshSession();
  bumpAccountEpoch();
  resolve(fresh);
  await p;
  expect(useAuthStore.getState().user).toBe(user);
});

it("auth error from a previous account's refresh does not log out", async () => {
  let reject!: (e: unknown) => void;
  getMe.mockReturnValue(new Promise<MeResponse>((_, r) => (reject = r)));
  useAuthStore.setState({ sessionStatus: "authenticated" });
  const logout = jest.spyOn(useAuthStore.getState(), "logout");
  const p = useAuthStore.getState().refreshSession();
  bumpAccountEpoch();
  reject(httpError(403));
  await p;
  expect(logout).not.toHaveBeenCalled();
  expect(useAuthStore.getState().sessionStatus).toBe("authenticated");
  expect(useAuthStore.getState().user).toBe(user);
});

it("mock login yields a non-expired token", async () => {
  await useAuthStore.getState().login("test@example.com", "password");
  expect(isTokenExpired(useAuthStore.getState().accessToken!)).toBe(false);
});

it("two parallel 401s produce exactly one logout", async () => {
  const logout = jest.fn(async () => {});
  useAuthStore.setState({ sessionStatus: "authenticated", logout });
  const adapter: AxiosAdapter = async (config) => {
    throw new AxiosError("x", "ERR_BAD_REQUEST", config, undefined, { status: 401, statusText: "", data: {}, headers: {}, config });
  };
  await Promise.allSettled([apiClient.get("/v1/me", { adapter }), apiClient.get("/v1/books", { adapter })]);
  expect(logout).toHaveBeenCalledTimes(1);
});

it("background refresh does not re-run ensureBook", async () => {
  const listBooks = jest.spyOn(booksApi, "listBooks").mockResolvedValue({ items: [{ id: "b1", name: "Personal" }] } as never);
  useAuthStore.setState({ sessionStatus: "authenticated", onboardingCompleted: true });
  render(createElement(DataBootstrap));
  await waitFor(() => expect(listBooks).toHaveBeenCalledTimes(1));
  await flush();
  await act(async () => { useAuthStore.getState().setUser({ ...user }); });
  await flush();
  expect(listBooks).toHaveBeenCalledTimes(1);
});

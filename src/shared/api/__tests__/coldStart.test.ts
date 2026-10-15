import { AxiosError, type AxiosAdapter, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

const T0 = new Date("2026-01-01T00:00:00Z").getTime();

let calls: Record<string, number>;
let timeouts: Record<string, (number | undefined)[]>;
let apiClient: typeof import("../client").apiClient;

// Times out on the first call per URL, succeeds on the second.
const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const url = config.url!;
  calls[url] = (calls[url] ?? 0) + 1;
  (timeouts[url] ??= []).push(config.timeout);
  if (calls[url] === 1) throw new AxiosError("timeout", "ECONNABORTED", config);
  return { data: {}, status: 200, statusText: "OK", headers: {}, config };
};
const get = (url: string, extra: AxiosRequestConfig = {}) => apiClient.get(url, { adapter, ...extra });

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] }).setSystemTime(T0);
  calls = {};
  timeouts = {};
  // coldStartUntil is computed at module load, so load the client at T0.
  jest.isolateModules(() => {
    apiClient = require("../client").apiClient;
  });
});
afterEach(() => jest.useRealTimers());

it("every request in the launch window gets the cold-start retry", async () => {
  await Promise.all([get("/v1/me"), get("/v1/books")]);
  expect(calls["/v1/me"]).toBe(2);
  expect(calls["/v1/books"]).toBe(2);
  expect(timeouts["/v1/me"][1]).toBe(45_000);
  expect(timeouts["/v1/books"][1]).toBe(45_000);
});

it("requests after the window fail fast", async () => {
  jest.setSystemTime(T0 + 4_000);
  await expect(get("/v1/me")).rejects.toMatchObject({ code: "ECONNABORTED" });
  expect(calls["/v1/me"]).toBe(1);
});

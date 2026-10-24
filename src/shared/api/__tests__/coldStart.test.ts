import { AxiosError, type AxiosAdapter, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

const T0 = new Date("2026-01-01T00:00:00Z").getTime();
let calls: Record<string, number>;
let timeouts: Record<string, (number | undefined)[]>;
let apiClient: typeof import("../client").apiClient;
let openColdStartWindow: typeof import("../client").openColdStartWindow;

const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const url = config.url!;
  calls[url] = (calls[url] ?? 0) + 1;
  (timeouts[url] ??= []).push(config.timeout);
  throw new AxiosError("timeout", "ECONNABORTED", config);
};
const get = (url: string, extra: AxiosRequestConfig = {}) => apiClient.get(url, { adapter, ...extra });

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] }).setSystemTime(T0);
  calls = {};
  timeouts = {};
  jest.isolateModules(() => {
    ({ apiClient, openColdStartWindow } = require("../client"));
  });
});
afterEach(() => jest.useRealTimers());

it("keeps each launch request alive for the startup budget without replaying it", async () => {
  const results = await Promise.allSettled([get("/v1/me"), get("/v1/books")]);
  expect(results.map(r => r.status)).toEqual(["rejected", "rejected"]);
  for (const url of ["/v1/me", "/v1/books"]) {
    expect(calls[url]).toBe(1);
    expect(timeouts[url]).toEqual([60_000]);
  }
});

it("uses the warm timeout after the startup window", async () => {
  await expect(get("/v1/first")).rejects.toMatchObject({ code: "ECONNABORTED" });
  jest.setSystemTime(T0 + 4_000);
  await expect(get("/v1/me")).rejects.toMatchObject({ code: "ECONNABORTED" });
  expect(calls["/v1/me"]).toBe(1);
  expect(timeouts["/v1/me"]).toEqual([15_000]);
});

it("reopens the longer timeout window after foreground resume", async () => {
  jest.setSystemTime(T0 + 10_000);
  openColdStartWindow();
  await Promise.allSettled([get("/v1/me"), get("/v1/books")]);
  expect(timeouts["/v1/me"]).toEqual([60_000]);
  expect(timeouts["/v1/books"]).toEqual([60_000]);
});

it("gives the first delayed request a startup budget only once", async () => {
  jest.setSystemTime(T0 + 20_000);
  await expect(get("/v1/first")).rejects.toMatchObject({ code: "ECONNABORTED" });
  await expect(get("/v1/later")).rejects.toMatchObject({ code: "ECONNABORTED" });
  expect(timeouts["/v1/first"]).toEqual([60_000]);
  expect(timeouts["/v1/later"]).toEqual([15_000]);
});

it("does not replay a timed-out login or write", async () => {
  for (const url of ["/v1/auth/login", "/v1/books"]) {
    await expect(apiClient.post(url, {}, { adapter })).rejects.toMatchObject({ code: "ECONNABORTED" });
    expect(calls[url]).toBe(1);
    expect(timeouts[url]).toEqual([60_000]);
  }
});

it("preserves explicit timeouts and the provider opt-out", async () => {
  await Promise.allSettled([
    get("/provider", { _skipColdStartTimeout: true }),
    get("/export", { timeout: 90_000 }),
  ]);
  expect(timeouts["/provider"]).toEqual([15_000]);
  expect(timeouts["/export"]).toEqual([90_000]);
});

it.each([429, 503])("does not retry an HTTP %s response", async (status) => {
  const rejectOverload: AxiosAdapter = async config => {
    calls.overload = (calls.overload ?? 0) + 1;
    throw new AxiosError("busy", "ERR_BAD_RESPONSE", config, undefined, {
      status, statusText: "Busy", data: {}, headers: { "retry-after": "1" }, config,
    });
  };
  await expect(get("/overload", { adapter: rejectOverload })).rejects.toMatchObject({ response: { status } });
  expect(calls.overload).toBe(1);
});

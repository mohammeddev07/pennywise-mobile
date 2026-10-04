// No @types/node in this app: the test only needs three Node globals.
declare const require: (id: string) => any;
declare const __dirname: string;
const { spawnSync } = require("child_process");
const path = require("path");

const script = path.join(__dirname, "../../../../scripts/release/check-config.cjs");
const googleId = "123456-abc.apps.googleusercontent.com";
const run = (env: Record<string, string>) =>
  spawnSync("node", [script], { env: { PATH: process.env.PATH ?? "", EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: googleId, ...env }, encoding: "utf8" });

describe("release config gate", () => {
  it("refuses mock mode, a missing URL, localhost and cleartext http", () => {
    expect(run({}).status).toBe(1);
    expect(run({ EXPO_PUBLIC_MOCK_API: "true", EXPO_PUBLIC_API_BASE_URL: "https://api.pennywise.app/api" }).status).toBe(1);
    expect(run({ EXPO_PUBLIC_API_BASE_URL: "http://localhost:8080/api" }).status).toBe(1);
    expect(run({ EXPO_PUBLIC_API_BASE_URL: "http://api.pennywise.app/api" }).status).toBe(1);
  });
  it("accepts an https API URL with the context path", () => {
    expect(run({ EXPO_PUBLIC_API_BASE_URL: "https://api.pennywise.app/api" }).status).toBe(0);
  });
  it("rejects a missing or malformed Google Web client ID", () => {
    const api = "https://api.pennywise.app/api";
    expect(run({ EXPO_PUBLIC_API_BASE_URL: api, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "" }).status).toBe(1);
    expect(run({ EXPO_PUBLIC_API_BASE_URL: api, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "android-client" }).status).toBe(1);
  });
});

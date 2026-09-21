/**
 * Release configuration gate. Run before an EAS/production build:
 *   EXPO_PUBLIC_API_BASE_URL=https://api.example.com/api node scripts/release/check-config.cjs
 * Exits 1 on: mock mode on, API URL missing / localhost / cleartext http, cleartext traffic allowed in app.json.
 * Wired as `npm run release:check` and as the EAS `eas-build-pre-install` hook.
 */
const fs = require("fs");
const path = require("path");
const problems = [];
const env = process.env;

if (env.EXPO_PUBLIC_MOCK_API === "true") problems.push("EXPO_PUBLIC_MOCK_API=true: the build would serve fake data instead of calling the API.");

const url = env.EXPO_PUBLIC_API_BASE_URL;
if (!url) problems.push("EXPO_PUBLIC_API_BASE_URL is unset: the client falls back to http://localhost:8080/api.");
else if (/^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url) || url.includes("example.com")) problems.push(`EXPO_PUBLIC_API_BASE_URL points at a local/placeholder host: ${url}`);
else if (/^http:\/\//.test(url)) problems.push(`EXPO_PUBLIC_API_BASE_URL is cleartext http: ${url} (tokens would travel unencrypted).`);
else if (!/\/api\/?$/.test(url)) problems.push(`EXPO_PUBLIC_API_BASE_URL should include the backend context path (/api): ${url}`);

const app = JSON.parse(fs.readFileSync(path.join(__dirname, "../../app.json"), "utf8")).expo;
if (app.android?.usesCleartextTraffic === true) problems.push("app.json android.usesCleartextTraffic is true.");
if (app.ios?.infoPlist?.NSAppTransportSecurity?.NSAllowsArbitraryLoads === true) problems.push("app.json ios NSAllowsArbitraryLoads is true.");

if (problems.length) {
  console.error("RELEASE CONFIG CHECK FAILED\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log("release config ok:", url);

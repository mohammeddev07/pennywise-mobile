/**
 * Backend cold start, measured separately from warm latency: kill the JVM, start it, and time
 *   process start -> /actuator/health UP, then the FIRST login / search / analyze against the 10k-row ledger.
 *   API_BASE=http://host:8080/api STATE=<seed state> BACKEND_BAT='<windows path to a bat that starts the jar>' node scripts/release/cold-start.cjs
 * (This is the JVM + connection pool + first-query cost. The Render free-tier spin-up the mobile client
 *  retries for is a different, longer thing and is not measurable here.)
 */
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const BASE = process.env.API_BASE, st = JSON.parse(fs.readFileSync(process.env.STATE, "utf8"));
const t = () => performance.now();
async function timed(name, fn) { const t0 = t(); const r = await fn(); const ms = t() - t0; console.log(`${name.padEnd(46)} ${ms.toFixed(0)} ms  (${r})`); return ms; }
const post = (p, body, token) => fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });
(async () => {
  try { execSync('cmd.exe /c taskkill /F /IM java.exe', { stdio: "ignore" }); } catch {}
  await new Promise((r) => setTimeout(r, 2000));
  const t0 = t();
  const p = spawn("cmd.exe", ["/c", process.env.BACKEND_BAT], { stdio: "ignore", detached: true }); p.unref();
  for (;;) { try { const r = await fetch(BASE + "/actuator/health"); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 50)); }
  console.log(`${"JVM start -> health UP".padEnd(46)} ${(t() - t0).toFixed(0)} ms`);
  const login = await timed("first login (bcrypt + JWT)", async () => { const r = await post("/v1/auth/login", { email: st.email, password: st.password }); const j = await r.json(); st.token = j.accessToken; return r.status; });
  const q = (body) => post(`/v1/books/${st.bookId}/transactions/search`, body, st.token);
  await timed("first search (10,000 rows, default sort)", async () => (await q({ page: { limit: 50 } })).status);
  await timed("second search", async () => (await q({ page: { limit: 50 } })).status);
  await timed("first analyze (MONTH, 4y)", async () => (await post(`/v1/books/${st.bookId}/transactions/analyze`, { bucket: "MONTH", window: { startDate: new Date(Date.now() - 4 * 365 * 864e5).toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) } }, st.token)).status);
  await timed("first export/query (10,000 rows -> xlsx)", async () => { const r = await post(`/v1/books/${st.bookId}/transactions/export/query`, {}, st.token); const b = await r.arrayBuffer(); return `${r.status}, ${(b.byteLength / 1024).toFixed(0)} KiB`; });
})();

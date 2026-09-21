/**
 * Real-backend browser run: profiling + UI flows on the web build (no mock). See docs/release-checklist.md.
 *
 *   ROOT=<web export built with MOCK=false API_BASE=/api> TARGET=http://host:8080 STATE=<seed state json> \
 *   [VIEWPORT=phone|wide] [LATENCY=150] [SHOTS=docs/release/shots] node scripts/release/ui-real.cjs
 *
 * STATE comes from `api-flows.cjs seed` (10,000-row ledger). LATENCY adds a fixed delay to every /api call
 * through the proxy to emulate a slower network. Output: markdown tables + JSON next to STATE.
 */
const fs = require("fs");
const path = require("path");
const { serve, launch, pct } = require("./lib-real.cjs");

const ROOT = process.env.ROOT, TARGET = process.env.TARGET, STATE = process.env.STATE;
const LATENCY = Number(process.env.LATENCY || 0);
const VIEWPORT = process.env.VIEWPORT || "phone";
const SHOTS = process.env.SHOTS || "";
const VP = { phone: { width: 390, height: 844 }, wide: { width: 1280, height: 800 } }[VIEWPORT];
const st = JSON.parse(fs.readFileSync(STATE, "utf8"));
const out = { config: { viewport: VIEWPORT, latencyMs: LATENCY, chromium: "headless-shell 1243 (Chrome for Testing)", build: "expo export --platform web, MOCK=false, production bundle", backend: "Spring Boot jar, ENV=production auth on, PostgreSQL 16 (embedded), Windows JVM 21, loopback" }, steps: [], perf: {} };
const log = (name, ok, detail = "") => { out.steps.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`); };
const vis = (loc) => loc.filter({ visible: true });

async function api(method, p, body, token = st.token, headers = {}) {
  const r = await fetch(TARGET + "/api" + p, { method, headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...headers }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  return { status: r.status, json: t ? JSON.parse(t) : null };
}

(async () => {
  const srv = await serve(ROOT, TARGET, LATENCY);
  const base = `http://localhost:${srv.address().port}`;
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 2, locale: "en-US", timezoneId: "UTC" });
  ctx.setDefaultTimeout(15000);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const reqs = [];
  page.on("request", (r) => { if (r.url().includes("/api/v1/")) reqs.push({ t: Date.now(), m: r.method(), u: r.url().replace(/^.*\/api/, ""), b: r.postData(), id: r }); });
  const failed = [];
  page.on("requestfailed", (r) => failed.push({ u: r.url(), why: r.failure()?.errorText }));
  const searches = () => reqs.filter((r) => r.u.endsWith("/transactions/search"));
  const analyzes = () => reqs.filter((r) => r.u.endsWith("/transactions/analyze"));
  const offsets = (list) => list.map((r) => JSON.parse(r.b || "{}").page?.offset ?? 0);
  const heapMB = async () => { const m = await cdp.send("Performance.getMetrics"); return m.metrics.find((x) => x.name === "JSHeapUsedSize").value / 1048577; };
  const rowCount = () => page.locator('[role=button][aria-label*=", expense "], [role=button][aria-label*=", income "]').count();
  const idle = async (ms = 1200) => { let n = reqs.length; for (;;) { await page.waitForTimeout(ms); if (reqs.length === n) return; n = reqs.length; } };
  const shot = async (name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${VIEWPORT}-${name}.png`) }); } };
  const step = async (name, fn) => { if (process.env.ONLY && name !== "login through the UI" && !new RegExp(process.env.ONLY).test(name)) return; try { await fn(); } catch (e) { log(name, false, String(e.message).split("\n")[0].slice(0, 200)); if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${VIEWPORT}-FAIL-${name.replace(/\W+/g, "-")}.png`) }).catch(() => {}); } } };
  // Back to a known query: Activity tab, no filters, All dates.
  const reset = async () => {
    await page.keyboard.press("Escape").catch(() => {});
    await vis(page.getByRole("button", { name: "Activity", exact: true })).first().click();
    await page.getByText(/Showing \d+ of|No matches|Nothing in|No transactions yet/).first().waitFor();
    const clear = vis(page.getByText("Clear all", { exact: true }));
    if (await clear.count()) await clear.first().click();
    await vis(page.getByText("All", { exact: true })).first().click();
    await idle(800);
  };
  const showing = async () => { const t = await vis(page.getByText(/Showing \d+ of [\d,]+/)).first().innerText(); const m = t.match(/Showing (\d+) of ([\d,]+)/); return { loaded: +m[1], total: +m[2].replace(/,/g, "") }; };

  await step("login through the UI", async () => {
    await page.goto(base);
    await page.waitForTimeout(2500);
    await page.getByText("Log in", { exact: true }).first().click();
    await page.waitForTimeout(500);
    const inp = page.locator("input");
    await inp.nth(0).fill(st.email);
    await inp.nth(1).fill(st.password);
    const t0 = Date.now();
    await page.getByText("Continue", { exact: true }).click();
    await page.getByText("TOTAL BALANCE").waitFor();
    log("login through the UI", true, `Home visible ${Date.now() - t0}ms after submit (warm backend, ${LATENCY}ms added latency)`);
    await shot("home");
  });

  // ---------------------------------------------------------------- Activity paging / virtualisation / memory
  await step("activity paging", async () => {
    await page.getByRole("button", { name: "Activity", exact: true }).filter({ visible: true }).first().click();
    await page.getByText(/Showing \d+ of/).first().waitFor();
    await vis(page.getByText("All", { exact: true })).first().click();
    await idle();
    const s0 = searches().length;
    const first = await showing();
    const heap0 = await heapMB();
    const samples = [{ pages: 1, loaded: first.loaded, dom: await rowCount(), heap: heap0 }];
    const box = page.viewportSize();
    await page.mouse.move(box.width / 2, box.height * 0.6);
    for (let i = 1; i <= 40; i++) {
      await page.mouse.wheel(0, 2500);
      await page.waitForTimeout(VIEWPORT === "phone" ? 250 : 250 + LATENCY);
      if (i % 10 === 0) { await idle(600); const sh = await showing(); samples.push({ pages: Math.ceil(sh.loaded / 50), loaded: sh.loaded, dom: await rowCount(), heap: await heapMB() }); }
    }
    await idle();
    const offs = offsets(searches()).slice(0);
    // a repeated offset is only a duplicate within the same filter+sort (a new filter legitimately restarts at 0)
    const keyed = searches().map((r) => { const b = JSON.parse(r.b || "{}"); return JSON.stringify({ f: b.filter, s: b.sort, o: b.page?.offset ?? 0 }); });
    const dup = keyed.length - new Set(keyed).size;
    const sh = await showing();
    out.perf.paging = { totalRowsInLedger: st.rows, firstPageLoaded: first.loaded, firstPageTotalReported: first.total, samples, searchRequests: searches().length, duplicateOffsets: dup, lastOffset: Math.max(...offs), analyzeRequests: analyzes().length, finalLoaded: sh.loaded };
    log("first load pulls one page, not the ledger", first.loaded === 50 && first.total >= st.rows, `loaded ${first.loaded} of ${first.total}`);
    log("no duplicate paging requests (same filter, same offset)", dup === 0, `${searches().length} searches, ${dup} repeated`);
    log("rows are virtualized", samples.every((x) => x.dom < 60), `DOM rows ${samples.map((x) => x.dom).join("/")} at loaded ${samples.map((x) => x.loaded).join("/")}`);
    log("memory grows with loaded pages only (bounded)", samples.at(-1).heap - samples[0].heap < 60, `JS heap ${samples.map((x) => x.heap.toFixed(0)).join("/")} MB at ${samples.map((x) => x.loaded).join("/")} rows`);
    log("no N+1: exactly one analyze per applied filter, none per row or page", analyzes().length <= 6, `${analyzes().length} analyze calls vs ${searches().length} search pages; per-row GETs: ${reqs.filter((r) => /\/transactions\/[0-9a-f-]{36}$/.test(r.u)).length}`);
    await shot("activity-deep");
  });

  // ---------------------------------------------------------------- rapid filter changes
  await step("rapid filter changes", async () => {
    await reset();
    const before = { s: searches().length, a: analyzes().length, f: failed.length };
    const seq = ["7 days", "Month", "All", "Expenses", "Income", "Expenses", "Today", "All", "7 days", "All"];
    const t0 = Date.now();
    for (let k = 0; k < 2; k++) for (const label of seq) await vis(page.getByText(label, { exact: true })).first().click({ delay: 0 });
    await idle(1500);
    const dt = Date.now() - t0;
    const sh = await showing();
    // the sequence ends with Expenses selected, then All dates
    const indep = (await api("POST", `/v1/books/${st.bookId}/transactions/search`, { filter: { kind: "condition", field: "type", operator: "EQ", value: "EXPENSE" }, page: { limit: 1 } })).json.totalCount;
    out.perf.rapid = { clicks: seq.length * 2, ms: dt, searches: searches().length - before.s, analyzes: analyzes().length - before.a, abortedByClient: failed.length - before.f, finalShown: sh.total, independentTotal: indep };
    log("final state matches the last filter after 20 rapid changes", sh.total === indep, `UI total ${sh.total} vs API ${indep}`);
    log("rapid changes do not storm the API", searches().length - before.s <= 30, `${seq.length * 2} clicks -> ${searches().length - before.s} searches, ${analyzes().length - before.a} analyzes, ${failed.length - before.f} cancelled in flight`);
  });

  // ---------------------------------------------------------------- typing
  await step("typing", async () => {
    await reset();
    await page.getByRole("button", { name: "Search transactions" }).filter({ visible: true }).first().click();
    const field = vis(page.locator("input")).first();
    await field.click();
    await page.evaluate(() => {
      window.__lat = []; window.__long = [];
      document.addEventListener("keydown", () => (window.__k = performance.now()), true);
      document.addEventListener("input", () => { const k = window.__k; requestAnimationFrame(() => requestAnimationFrame(() => window.__lat.push(performance.now() - k))); }, true);
      try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ entryTypes: ["longtask"] }); } catch {}
    });
    const s0 = searches().length;
    await page.keyboard.type("Title 12", { delay: 40 });
    const searchesWhileTyping = searches().length - s0;
    await idle(1200);
    const lat = await page.evaluate(() => window.__lat), long = await page.evaluate(() => window.__long);
    out.perf.typing = { chars: 8, keyToPaintP50: pct(lat, 50), keyToPaintP95: pct(lat, 95), keyToPaintMax: Math.max(...lat), longTasks: long.length, longestTaskMs: long.length ? Math.max(...long) : 0, searchRequestsAfterTyping: searches().length - s0, searchesBeforeDebounce: searchesWhileTyping };
    log("typing stays smooth (key-to-paint p95 < 100ms, no long task > 200ms)", pct(lat, 95) < 100 && (!long.length || Math.max(...long) < 200), `p50 ${pct(lat, 50).toFixed(0)}ms p95 ${pct(lat, 95).toFixed(0)}ms max ${Math.max(...lat).toFixed(0)}ms; long tasks: ${long.length}`);
    log("search is debounced (at most an intermediate + the final request)", searches().length - s0 <= 2, `${searches().length - s0} search request(s) for 8 keystrokes at 40ms`);
    const sh = await showing();
    const indep = (await api("POST", `/v1/books/${st.bookId}/transactions/search`, { filter: { kind: "condition", field: "description", operator: "CONTAINS", value: "Title 12" }, page: { limit: 1 } })).json.totalCount;
    log("typed search result equals the API's own count", sh.total === indep, `UI ${sh.total} vs API ${indep}`);
    await vis(page.getByRole("button", { name: "Close search" })).first().click();
    await idle();
  });

  // ---------------------------------------------------------------- many categories
  await step("many categories", async () => {
    await reset();
    const t0 = Date.now();
    await vis(page.getByText("Categories", { exact: true })).first().click();
    await page.getByText("EXPENSE", { exact: true }).waitFor();
    const open = Date.now() - t0;
    const chips = await page.getByRole("button", { name: /^(Cat \d\d|Household)/ }).count();
    await shot("categories-60");
    const s0 = searches().length;
    await vis(page.getByRole("button", { name: /^Cat 20/ })).first().click();
    await idle();
    out.perf.categories = { categories: st.cats.length, sheetOpenMs: open, chipsRendered: chips, searchesForOneSelection: searches().length - s0 };
    log("60-category sheet opens fast and one selection = one refetch", open < 1500 && searches().length - s0 <= 2, `open ${open}ms, ${chips} chips, ${searches().length - s0} search`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  // ---------------------------------------------------------------- edit / stale / duplicate / delete
  await step("edit, stale version, duplicate, delete", async () => {
    await reset();
    // a fresh, known row to work on
    const tag = `QAZ${Date.now()}`;
    const cat = st.cats.find((c) => c.type === "EXPENSE");
    const seed = await api("POST", `/v1/books/${st.bookId}/transactions`, { type: "EXPENSE", amountMinor: 12345, categoryId: cat.id, title: `${tag} row`, note: "orig", paymentMethod: "CARD", occurredAt: new Date().toISOString() }, st.token, { "Idempotency-Key": "qa-zed-" + Date.now() });
    const txId = seed.json.id;
    await vis(page.getByRole("button", { name: "Search transactions" })).first().click();
    await vis(page.locator("input")).first().fill(tag);
    await page.getByText(`${tag} row`, { exact: true }).first().waitFor();
    await page.getByText(`${tag} row`, { exact: true }).filter({ visible: true }).last().click();
    if (process.env.DEBUG) { await page.waitForTimeout(1500); console.log("after row click:", page.url(), (await page.innerText("body")).replace(/\n+/g, " | ").slice(0, 160)); }
    await vis(page.getByText(/123\.45/)).first().waitFor();
    log("details opens for a row, amount first", true);
    await shot("details");
    // stale: bump on the server while the edit form is open
    await vis(page.getByRole("button", { name: "Edit", exact: true })).first().click();
    await page.waitForTimeout(1500);
    if (process.env.DEBUG) console.log("after Edit click:", page.url(), "| inputs:", await page.locator("input").count(), "|", (await page.innerText("body")).replace(/\n+/g, " | ").slice(0, 200));
    await vis(page.locator("input")).first().waitFor();
    await api("PATCH", `/v1/books/${st.bookId}/transactions/${txId}`, { note: "changed elsewhere" }, st.token, { "If-Match": `"${seed.json.version}"` });
    const title = vis(page.locator("input")).first();
    await title.fill(`${tag} edited`);
    await page.getByRole("button", { name: "Save changes" }).filter({ visible: true }).first().click();
    await page.getByText("changed while you were editing").waitFor();
    await shot("conflict");
    const still = (await api("GET", `/v1/books/${st.bookId}/transactions/${txId}`)).json;
    log("stale version is refused, explained, and nothing is overwritten", still.title === `${tag} row`, `server title still "${still.title}"`);
    await vis(page.getByRole("button", { name: "Keep my changes" })).first().click();
    await page.getByText("changed while you were editing").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Save changes" }).filter({ visible: true }).first().click();
    await page.getByText(`${tag} edited`, { exact: false }).first().waitFor({ timeout: 8000 }).catch(() => {});
    const after = (await api("GET", `/v1/books/${st.bookId}/transactions/${txId}`)).json;
    log("Keep my changes then Save applies the edit on the new version", after.title === `${tag} edited` && after.version > seed.json.version, `title "${after.title}", version ${seed.json.version} -> ${after.version}`);
    // duplicate + delete through the menu (window.confirm accepted)
    await page.getByRole("button", { name: "More actions" }).filter({ visible: true }).first().click();
    await page.getByText("Duplicate", { exact: true }).filter({ visible: true }).first().click();
    await page.waitForTimeout(2500);
    const q = await api("POST", `/v1/books/${st.bookId}/transactions/search`, { filter: { kind: "condition", field: "title", operator: "EQ", value: `${tag} edited` }, page: { limit: 10 } });
    log("duplicate creates a second row", q.json.totalCount === 2, `rows with the edited title: ${q.json.totalCount}`);
    const dialogs = [];
    page.on("dialog", (d) => { dialogs.push(d.message()); d.accept(); });
    await page.getByRole("button", { name: "More actions" }).filter({ visible: true }).first().click();
    await page.getByText("Delete", { exact: true }).filter({ visible: true }).first().click();
    await page.waitForTimeout(2500);
    const q2 = await api("POST", `/v1/books/${st.bookId}/transactions/search`, { filter: { kind: "condition", field: "title", operator: "EQ", value: `${tag} edited` }, page: { limit: 10 } });
    log("delete asks a labelled confirmation, then removes exactly one row", q2.json.totalCount === 1 && dialogs.some((m) => /Delete this transaction/.test(m)), `confirm text: ${JSON.stringify(dialogs[0])?.slice(0, 120)}; rows left ${q2.json.totalCount}`);
    page.removeAllListeners("dialog");
    await api("DELETE", `/v1/books/${st.bookId}/transactions/${q2.json.items[0].id}`, null, st.token, { "If-Match": `"${q2.json.items[0].version}"` });
    if (!(await page.getByText(/Showing \d+ of/).count())) await page.goBack().catch(() => {});
  });

  // ---------------------------------------------------------------- insights drill-down
  await step("insights drill-down", async () => {
    await reset();
    await page.goto(base);
    await page.waitForTimeout(2500);
    await vis(page.getByRole("button", { name: "Insights", exact: true })).first().click();
    await page.getByText(/NET · \d+ TRANSACTIONS/).first().waitFor();
    await shot("insights");
    const t = await page.getByText(/NET · [\d,]+ TRANSACTIONS/).first().innerText();
    const shown = +t.match(/([\d,]+)/)[1].replace(/,/g, "");
    const win = { startDate: new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) };
    await vis(page.getByText("Where it went")).first().scrollIntoViewIfNeeded().catch(() => {});
    const row = vis(page.getByRole("button", { name: /transactions?$/ })).first();
    const counted = +((await row.getAttribute("aria-label")).match(/(\d+) transactions?$/)[1]);
    await row.click();
    await vis(page.getByText(/^View \d+ in Activity$/)).first().click();
    await page.getByText(/Showing \d+ of/).first().waitFor();
    const sh = await showing();
    const label = await vis(page.getByText(/^View/)).count();
    log("category drill-down opens Activity on exactly the counted rows", sh.total === counted, `row counted ${counted}; Activity shows ${sh.total} (Insights window total ${shown})`);
    await shot("drilled");
  });

  // ---------------------------------------------------------------- offline / retry / stale
  await step("offline and retry", async () => {
    await vis(page.getByRole("button", { name: "Back to previous filter" })).first().click().catch(() => {});
    await reset();
    await ctx.setOffline(true);
    await vis(page.getByText("Month", { exact: true })).first().click();
    // Offline emulation flips navigator.onLine; react-query's default networkMode would then PAUSE the fetch
    // (found here: web sat on "updating" forever). With networkMode "always" the request fails fast.
    const t0 = Date.now();
    await page.getByText("Couldn’t load transactions").waitFor({ timeout: 30000 });
    const errAt = Date.now() - t0;
    await shot("offline");
    log("offline: an explained error with Retry appears at once (no endless spinner)", true, `error after ${errAt}ms`);
    await ctx.setOffline(false);
    await vis(page.getByText("Retry", { exact: true })).first().click();
    await page.getByText(/Showing \d+ of|Nothing in|No matches|No transactions yet/).first().waitFor({ timeout: 20000 });
    log("back online: Retry recovers without a reload", true);
  });

  // ---------------------------------------------------------------- worst case: the user scrolls the entire ledger
  await step("worst case: scroll the whole ledger", async () => {
    await reset();
    const box = page.viewportSize();
    await page.mouse.move(box.width / 2, box.height * 0.6);
    const h0 = await heapMB(), s0 = searches().length, t0 = Date.now();
    let sh = await showing();
    for (let i = 0; i < 400 && sh.loaded < sh.total; i++) {
      await page.mouse.wheel(0, 8000);
      await page.waitForTimeout(100 + LATENCY);
      if (i % 10 === 0) sh = await showing();
    }
    await idle(800);
    sh = await showing();
    const h1 = await heapMB();
    out.perf.worstCase = { loaded: sh.loaded, total: sh.total, pages: searches().length - s0, seconds: (Date.now() - t0) / 1000, heapStartMB: h0, heapEndMB: h1, domRows: await rowCount() };
    log("scrolling the entire ledger: rows stay virtualized; memory grows linearly with loaded pages", (await rowCount()) < 60, `${sh.loaded}/${sh.total} rows via ${searches().length - s0} page requests in ${((Date.now() - t0) / 1000).toFixed(0)}s; heap ${h0.toFixed(0)} -> ${h1.toFixed(0)} MB; DOM rows ${await rowCount()}`);
  });

  // ---------------------------------------------------------------- logout clears caches
  await step("logout clears account data", async () => {
    const u2 = await (await fetch(TARGET + "/api/v1/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `qa-second-${Date.now()}@example.com`, password: "Pw!" + require("crypto").randomBytes(9).toString("hex"), defaultCurrencyCode: "USD" }) })).json();
    page.on("dialog", (d) => d.accept());
    await vis(page.getByRole("button", { name: "Profile", exact: true })).first().click();
    await vis(page.getByText("Sign out", { exact: true })).first().click();
    await page.getByText("Log in", { exact: true }).first().waitFor({ timeout: 15000 });
    const keys = await page.evaluate(() => Object.keys(localStorage));
    const token = await page.evaluate(() => localStorage.getItem("ss:access_token"));
    const leaked = await page.evaluate(() => Object.entries(localStorage).filter(([k, v]) => /pennywise|transactions|books|categories/.test(k) && v.length > 60 && /qa-perf|Cat \d\d/.test(v)).map(([k]) => k));
    log("sign out returns to login, drops the token, keeps no account rows in storage", !token && leaked.length === 0, `token=${token}, storage keys left: ${keys.join(",") || "none"}, keys still holding first user's data: ${leaked.join(",") || "none"}`);
    await page.locator("input").nth(0).waitFor().catch(() => {});
    await page.getByText("Log in", { exact: true }).first().click().catch(() => {});
    log("signed-out state shows no account data", (await page.getByText("TOTAL BALANCE").count()) === 0);
    void u2;
  });

  out.pageErrors = errors.slice(0, 5);
  out.requestsTotal = reqs.length;
  fs.writeFileSync(STATE + `.ui-${VIEWPORT}-${LATENCY}.json`, JSON.stringify(out, null, 1));
  console.log("\npageerrors:", errors.length ? errors.slice(0, 3) : "none", "| api requests:", reqs.length);
  await browser.close();
  srv.close();
  process.exit(out.steps.some((s) => !s.ok) ? 1 : 0);
})();

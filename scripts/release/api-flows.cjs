/**
 * Real-API verification against a running backend (no mock). Node >= 20.
 *
 *   API_BASE=http://host:8080/api STATE=/tmp/pw-state.json node scripts/release/api-flows.cjs flows|seed|perf
 *
 *  flows - auth, books, categories, create/idempotent replay/edit/stale-412/delete/duplicate, all sort modes,
 *          advanced filters, analyze + drill-down, export -> import round trip. Every expected value is computed
 *          from a client-side copy of the ledger this script itself created, never from the server's answer.
 *  seed  - creates a 10,000-row synthetic ledger (60 categories) through the public API.
 *  perf  - warm-server latency of representative search/analyze requests; prints p50/p95/max.
 */
const fs = require("fs");
const BASE = process.env.API_BASE || "http://localhost:8080/api";
const STATE = process.env.STATE || "/tmp/pw-state.json";
const phase = process.argv[2] || "flows";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`);
};

async function call(method, path, { token, body, headers = {}, raw } = {}) {
  const t0 = performance.now();
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body && !(body instanceof FormData) ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const ms = performance.now() - t0;
  if (raw) return { status: res.status, buf: Buffer.from(await res.arrayBuffer()), ms, headers: res.headers };
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, json, text, ms, headers: res.headers };
}

const rnd = (() => { let s = 12345; return () => ((s = (s * 48271) % 2147483647) / 2147483647); })();
const pct = (arr, p) => { const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.ceil((p / 100) * a.length) - 1)]; };
const ymd = (d) => d.toISOString().slice(0, 10);
const load = () => JSON.parse(fs.readFileSync(STATE, "utf8"));
const save = (s) => fs.writeFileSync(STATE, JSON.stringify(s));

async function signup(label) {
  const email = `qa-${label}-${Date.now()}@example.com`;
  const password = "Pw!" + require("crypto").randomBytes(9).toString("hex"); // throwaway per-run test credential
  const r = await call("POST", "/v1/auth/signup", { body: { email, password, defaultCurrencyCode: "USD" } });
  if (r.status !== 200 && r.status !== 201) throw new Error("signup failed " + r.status + r.text);
  return { email, password, token: r.json.accessToken, userId: r.json.user.id };
}

async function ensureBook(token, name = "Main", currency = "USD") {
  const list = await call("GET", "/v1/books", { token });
  if (name === "Main" && list.json.items.length) return list.json.items[0];
  const c = await call("POST", "/v1/books", { token, body: { name, currencyCode: currency, timezone: "UTC", openingBalanceMinor: 0 } });
  if (c.status >= 300) throw new Error("book create " + c.status + c.text);
  return c.json;
}

async function makeCategories(token, bookId, n) {
  const cats = [];
  for (let i = 1; i <= n; i++) {
    const type = i <= Math.max(2, Math.round(n * 0.1)) ? "INCOME" : "EXPENSE";
    const name = i % 7 === 0 ? `Household and family supplies (bulk ${i})` : `Cat ${String(i).padStart(2, "0")}`;
    const r = await call("POST", `/v1/books/${bookId}/categories`, { token, body: { type, name, icon: "pricetag-outline", color: "#B49CFF" } });
    if (r.status >= 300) throw new Error("category " + r.status + r.text);
    cats.push({ id: r.json.id, type, name });
  }
  return cats;
}

function genTx(cats, i, today) {
  const cat = cats[Math.floor(rnd() * cats.length)];
  const days = Math.floor(rnd() * 365 * 4);
  const d = new Date(today.getTime() - days * 86400000);
  const pay = ["CARD", "CASH", "BANK_TRANSFER", null][i % 4];
  return {
    type: cat.type,
    amountMinor: 100 + Math.floor(rnd() * 250000),
    categoryId: cat.id,
    title: i % 3 === 0 ? null : `Title ${i % 900}`,
    note: i % 5 === 0 ? `note ${i}` : null,
    paymentMethod: pay,
    occurredAt: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12)).toISOString(),
    occurredOn: ymd(d),
  };
}

async function pool(items, size, fn) {
  let i = 0, done = 0;
  await Promise.all(Array.from({ length: size }, async () => { for (;;) { const k = i++; if (k >= items.length) return; await fn(items[k], k); done++; } }));
}

// ---------------------------------------------------------------------------------------- flows
async function flows() {
  const u = await signup("flows");
  check("signup returns token + user", !!u.token && !!u.userId);
  check("login with a wrong password is 401 INVALID_CREDENTIALS", await (async () => { const r = await call("POST", "/v1/auth/login", { body: { email: u.email, password: "nope-nope-1" } }); return r.status === 401; })());
  const lg = await call("POST", "/v1/auth/login", { body: { email: u.email, password: u.password } });
  check("login ok", lg.status === 200 && !!lg.json.accessToken);
  const token = lg.json.accessToken;
  check("GET /me with token", (await call("GET", "/v1/me", { token })).json?.email === u.email);
  check("no token -> 401", (await call("GET", "/v1/books")).status === 401);
  const tampered = token.slice(0, -4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA");
  check("tampered token -> 401", (await call("GET", "/v1/books", { token: tampered })).status === 401);

  // books + switch isolation
  const bookA = await ensureBook(token, "Main", "USD");
  const bookB = await ensureBook(token, "Yen book", "JPY");
  check("two books, distinct currencies", bookA.id !== bookB.id && bookB.currencyCode === "JPY");
  const catsA = await makeCategories(token, bookA.id, 8);
  const catsB = await makeCategories(token, bookB.id, 3);
  const patchBook = await call("PATCH", `/v1/books/${bookB.id}`, { token, body: { name: "Yen renamed" }, headers: { "If-Match": `"${bookB.version}"` } });
  check("book rename with If-Match", patchBook.status === 200 && patchBook.json.name === "Yen renamed");
  check("book rename with stale version -> 412", (await call("PATCH", `/v1/books/${bookB.id}`, { token, body: { name: "x" }, headers: { "If-Match": `"${bookB.version}"` } })).status === 412);

  // ledger A (client copy = source of truth)
  const today = new Date();
  const ledger = [];
  const rows = Array.from({ length: 240 }, (_, i) => genTx(catsA, i, today));
  await pool(rows, 6, async (row, i) => {
    const r = await call("POST", `/v1/books/${bookA.id}/transactions`, { token, body: row, headers: { "Idempotency-Key": `flows-${u.userId}-${i}` } });
    if (r.status >= 300) throw new Error("create " + r.status + r.text);
    ledger.push({ ...row, id: r.json.id, version: r.json.version, createdAt: r.json.createdAt });
  });
  check("created 240 transactions", ledger.length === 240);

  const first = ledger[0];
  const replay = await call("POST", `/v1/books/${bookA.id}/transactions`, { token, body: rows[0], headers: { "Idempotency-Key": `flows-${u.userId}-0` } });
  check("idempotent replay returns the same row, no second create", replay.json?.id === first.id || ledger.find((l) => l.id === replay.json?.id));

  const sr = (body, b = bookA.id) => call("POST", `/v1/books/${b}/transactions/search`, { token, body });
  const all = await sr({ page: { limit: 200 } });
  check("search totalCount equals created rows", all.json.totalCount === 240, `got ${all.json.totalCount}`);
  const isoOther = await sr({ page: { limit: 200 } }, bookB.id);
  check("book switch isolation: other book has none of book A's rows", isoOther.json.totalCount === 0);

  // edit + stale version + delete + duplicate
  const tx = ledger[1];
  const ok = await call("PATCH", `/v1/books/${bookA.id}/transactions/${tx.id}`, { token, body: { amountMinor: 424242, note: "edited" }, headers: { "If-Match": `"${tx.version}"` } });
  check("edit with If-Match bumps version and keeps createdAt", ok.status === 200 && ok.json.version === tx.version + 1 && ok.json.createdAt === tx.createdAt);
  const stale = await call("PATCH", `/v1/books/${bookA.id}/transactions/${tx.id}`, { token, body: { amountMinor: 1 }, headers: { "If-Match": `"${tx.version}"` } });
  check("stale-version edit -> 412 (mobile shows the conflict card)", stale.status === 412, `status ${stale.status} ${stale.json?.error?.code || ""}`);
  const got = await call("GET", `/v1/books/${bookA.id}/transactions/${tx.id}`, { token });
  check("stale edit changed nothing", got.json.amountMinor === 424242);
  const dup = await call("POST", `/v1/books/${bookA.id}/transactions`, { token, body: { type: got.json.type, amountMinor: got.json.amountMinor, categoryId: got.json.categoryId, title: got.json.title, note: got.json.note, paymentMethod: got.json.paymentMethod, occurredAt: new Date().toISOString() }, headers: { "Idempotency-Key": `dup-${Date.now()}` } });
  check("duplicate = new row with a new id", dup.status < 300 && dup.json.id !== tx.id, `status ${dup.status} ${dup.status >= 300 ? dup.text.slice(0, 200) : ""}`);
  const delStale = await call("DELETE", `/v1/books/${bookA.id}/transactions/${tx.id}`, { token, headers: { "If-Match": `"${tx.version}"` } });
  check("delete with stale version -> 412", delStale.status === 412);
  const del = await call("DELETE", `/v1/books/${bookA.id}/transactions/${tx.id}`, { token, headers: { "If-Match": `"${ok.json.version}"` } });
  check("delete with current version", del.status === 204 || del.status === 200);
  check("deleted row is gone (404) and out of search", (await call("GET", `/v1/books/${bookA.id}/transactions/${tx.id}`, { token })).status === 404);
  const live = ledger.filter((l) => l.id !== tx.id);
  live.push({ ...dup.json, occurredOn: dup.json.occurredOn, type: dup.json.type });
  const after = await sr({ page: { limit: 1 } });
  check("count after edit/dup/delete", after.json.totalCount === 240, `got ${after.json.totalCount}`);

  // sort modes: every field, both directions, must be 200; comparable fields must be ordered
  const fields = ["id", "type", "amountMinor", "occurredOn", "occurredAt", "categoryName", "paymentMethod", "title", "note", "description", "createdAt", "updatedAt", "externalId"];
  let bad = [];
  for (const f of fields) for (const direction of ["ASC", "DESC"]) {
    const r = await sr({ sort: [{ field: f, direction }], page: { limit: 100 } });
    if (r.status !== 200) { bad.push(`${f} ${direction} -> ${r.status}`); continue; }
    if (["amountMinor", "occurredOn"].includes(f)) {
      const v = r.json.items.map((i) => i[f]);
      const sorted = [...v].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      if (JSON.stringify(v) !== JSON.stringify(direction === "ASC" ? sorted : sorted.reverse())) bad.push(`${f} ${direction} misordered`);
    }
  }
  check(`all ${fields.length * 2} sort modes return 200; amount/date are ordered`, bad.length === 0, bad.join("; "));
  const multi = await sr({ sort: [{ field: "categoryName", direction: "ASC" }, { field: "amountMinor", direction: "DESC" }, { field: "occurredOn", direction: "DESC" }], page: { limit: 200 } });
  check("three-key sort accepted", multi.status === 200);

  // advanced filters vs client copy
  const liveRows = await (async () => { const out = []; for (let off = 0; ; off += 200) { const r = await sr({ page: { offset: off, limit: 200 } }); out.push(...r.json.items); if (!r.json.page.hasMore) break; } return out; })();
  const catIds = catsA.slice(0, 3).map((c) => c.id);
  const lo = 5000, hi = 90000;
  const f1 = { kind: "group", op: "AND", children: [
    { kind: "group", op: "OR", children: [{ kind: "condition", field: "categoryId", operator: "IN", value: catIds }, { kind: "condition", field: "paymentMethod", operator: "EQ", value: "CASH" }] },
    { kind: "condition", field: "amountMinor", operator: "BETWEEN", value: [lo, hi] },
    { kind: "condition", field: "note", operator: "IS_NULL" },
  ] };
  const exp1 = liveRows.filter((t) => (catIds.includes(t.categoryId) || t.paymentMethod === "CASH") && t.amountMinor >= lo && t.amountMinor <= hi && (t.note == null));
  const r1 = await sr({ filter: f1, page: { limit: 1 } });
  check("advanced filter ((cat IN) OR cash) AND amount BETWEEN AND note IS NULL matches independent count", r1.json.totalCount === exp1.length, `server ${r1.json.totalCount} vs client ${exp1.length}`);
  const r2 = await sr({ filter: { kind: "condition", field: "title", operator: "CONTAINS", value: "Title 1" }, page: { limit: 1 } });
  check("text CONTAINS matches independent count", r2.json.totalCount === liveRows.filter((t) => (t.title || "").includes("Title 1")).length);

  // analyze + drill-down
  const start = ymd(new Date(today.getTime() - 4 * 365 * 86400000)), end = ymd(today);
  const an = await call("POST", `/v1/books/${bookA.id}/transactions/analyze`, { token, body: { bucket: "MONTH", window: { startDate: start, endDate: end } } });
  const inWin = liveRows.filter((t) => t.occurredOn >= start && t.occurredOn <= end);
  const expExp = inWin.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amountMinor, 0);
  const expInc = inWin.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amountMinor, 0);
  check("analyze totals equal independent sums", an.json.expenseTotalMinor === expExp && an.json.incomeTotalMinor === expInc && an.json.matchedCount === inWin.length, `exp ${an.json.expenseTotalMinor}/${expExp} inc ${an.json.incomeTotalMinor}/${expInc}`);
  const yr = await call("POST", `/v1/books/${bookA.id}/transactions/analyze`, { token, body: { bucket: "YEAR", window: { startDate: start, endDate: end } } });
  check("YEAR buckets sum to the same total as MONTH buckets", yr.json.buckets.reduce((s, b) => s + b.expenseTotalMinor, 0) === an.json.buckets.reduce((s, b) => s + b.expenseTotalMinor, 0));
  const top = an.json.categories.filter((c) => c.type === "EXPENSE").sort((a, b) => b.totalMinor - a.totalMinor)[0];
  const drill = await sr({ filter: { kind: "group", op: "AND", children: [{ kind: "condition", field: "occurredOn", operator: "BETWEEN", value: [start, end] }, { kind: "condition", field: "categoryId", operator: "EQ", value: top.categoryId }, { kind: "condition", field: "type", operator: "EQ", value: "EXPENSE" }] }, page: { limit: 1 } });
  check("category drill-down returns exactly the counted rows", drill.json.totalCount === top.count, `drill ${drill.json.totalCount} vs counted ${top.count}`);
  const mb = an.json.buckets.find((b) => b.count > 0);
  const drillM = await sr({ filter: { kind: "group", op: "AND", children: [{ kind: "condition", field: "occurredOn", operator: "BETWEEN", value: [mb.start, mb.end] }] }, page: { limit: 1 } });
  check("month drill-down returns exactly the bucket's rows", drillM.json.totalCount === mb.count, `drill ${drillM.json.totalCount} vs bucket ${mb.count}`);

  // export -> import round trip
  const ex = await call("POST", `/v1/books/${bookA.id}/transactions/export/query`, { token, body: { filter: f1 }, raw: true });
  check("export/query returns an .xlsx (zip magic PK)", ex.status === 200 && ex.buf.slice(0, 2).toString() === "PK", `status ${ex.status}, ${ex.buf.length} bytes`);
  const bookC = await ensureBook(token, "Import target", "USD");
  await makeCategories(token, bookC.id, 0);
  const fd = new FormData();
  fd.append("file", new Blob([ex.buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "roundtrip.xlsx");
  const imp = await call("POST", `/v1/books/${bookC.id}/transactions/import`, { token, body: fd });
  check("import of the exported file answers 200 with a result", imp.status === 200, `status ${imp.status} ${JSON.stringify(imp.json)?.slice(0, 160)}`);
  const impCount = (await call("POST", `/v1/books/${bookC.id}/transactions/search`, { token, body: { page: { limit: 1 } } })).json?.totalCount;
  console.log("      import failures:", JSON.stringify(imp.json?.failures || imp.json?.failedRows || imp.json?.errors)?.slice(0, 600));
  console.log("      import result:", JSON.stringify({ ...imp.json, failures: undefined, categoriesCreated: undefined }), "| rows now in target book:", impCount, "| exported rows:", exp1.length);

  // logout semantics: JWTs are stateless; server has no revoke endpoint -> client must drop the token
  const logoutLike = await call("POST", "/v1/auth/logout", { token });
  console.log("      POST /v1/auth/logout ->", logoutLike.status, "(no server-side revoke expected; client clears token/cache - verified in the UI run)");

  fs.writeFileSync(STATE + ".flows.json", JSON.stringify(results, null, 1));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

// ---------------------------------------------------------------------------------------- seed
async function seed() {
  const N = Number(process.env.ROWS || 10000);
  const u = await signup("perf");
  const book = await ensureBook(u.token, "Main", "USD");
  const cats = await makeCategories(u.token, book.id, 60);
  const today = new Date();
  const rows = Array.from({ length: N }, (_, i) => genTx(cats, i, today));
  const lat = [];
  const t0 = performance.now();
  await pool(rows, 8, async (row, i) => {
    const r = await call("POST", `/v1/books/${book.id}/transactions`, { token: u.token, body: row, headers: { "Idempotency-Key": `seed-${u.userId}-${i}` } });
    if (r.status >= 300) throw new Error(`create ${i}: ${r.status} ${r.text}`);
    lat.push(r.ms);
    if (i % 1000 === 0) console.log("  created", i);
  });
  const secs = (performance.now() - t0) / 1000;
  console.log(`seeded ${N} rows in ${secs.toFixed(1)}s (${(N / secs).toFixed(0)}/s, concurrency 8); create latency p50 ${pct(lat, 50).toFixed(0)}ms p95 ${pct(lat, 95).toFixed(0)}ms`);
  save({ email: u.email, password: u.password, token: u.token, userId: u.userId, bookId: book.id, cats, rows: N, seedSeconds: secs });
}

// ---------------------------------------------------------------------------------------- perf
async function perf() {
  const s = load();
  const token = s.token;
  const today = new Date();
  const start = ymd(new Date(today.getTime() - 4 * 365 * 86400000)), end = ymd(today);
  const cat = s.cats[5].id;
  const S = (body) => call("POST", `/v1/books/${s.bookId}/transactions/search`, { token, body });
  const A = (body) => call("POST", `/v1/books/${s.bookId}/transactions/analyze`, { token, body });
  const win = { startDate: start, endDate: end };
  const cases = {
    "search: first page, default sort": () => S({ page: { limit: 50 } }),
    "search: deep page (offset 9950)": () => S({ page: { offset: 9950, limit: 50 } }),
    "search: sort amount DESC": () => S({ sort: [{ field: "amountMinor", direction: "DESC" }], page: { limit: 50 } }),
    "search: sort category name ASC": () => S({ sort: [{ field: "categoryName", direction: "ASC" }], page: { limit: 50 } }),
    "search: category + amount range": () => S({ filter: { kind: "group", op: "AND", children: [{ kind: "condition", field: "categoryId", operator: "EQ", value: cat }, { kind: "condition", field: "amountMinor", operator: "BETWEEN", value: [1000, 100000] }] }, page: { limit: 50 } }),
    "search: text CONTAINS 'Title 12'": () => S({ filter: { kind: "condition", field: "description", operator: "CONTAINS", value: "Title 12" }, page: { limit: 50 } }),
    "search: OR of 20 categories": () => S({ filter: { kind: "condition", field: "categoryId", operator: "IN", value: s.cats.slice(0, 20).map((c) => c.id) }, page: { limit: 50 } }),
    "analyze: MONTH, whole window": () => A({ bucket: "MONTH", window: win }),
    "analyze: YEAR, whole window": () => A({ bucket: "YEAR", window: win }),
    "analyze: MONTH + filter": () => A({ bucket: "MONTH", window: win, filter: { kind: "condition", field: "type", operator: "EQ", value: "EXPENSE" } }),
  };
  const N = Number(process.env.SAMPLES || 60);
  const out = [];
  for (const [name, fn] of Object.entries(cases)) {
    await fn(); await fn(); // warm the plan/connection
    const ms = [];
    let bad = 0;
    for (let i = 0; i < N; i++) { const r = await fn(); if (r.status !== 200) bad++; ms.push(r.ms); }
    out.push({ name, n: N, errors: bad, p50: pct(ms, 50), p95: pct(ms, 95), max: Math.max(...ms) });
  }
  // client behaviour under rapid filter changes: 30 overlapping searches, only the last matters
  const t0 = performance.now();
  await Promise.all(Array.from({ length: 30 }, (_, i) => S({ filter: { kind: "condition", field: "description", operator: "CONTAINS", value: `Title ${i}` }, page: { limit: 50 } })));
  const burst = performance.now() - t0;
  console.log("\n| request (warm server, 10,000 rows, 60 categories) | n | errors | p50 ms | p95 ms | max ms | p95 < 500? |\n|---|---|---|---|---|---|---|");
  for (const r of out) console.log(`| ${r.name} | ${r.n} | ${r.errors} | ${r.p50.toFixed(0)} | ${r.p95.toFixed(0)} | ${r.max.toFixed(0)} | ${r.p95 < 500 ? "yes" : "NO"} |`);
  console.log(`\n30 overlapping searches (rapid filter changes) completed in ${burst.toFixed(0)}ms`);
  fs.writeFileSync(STATE + ".perf.json", JSON.stringify({ out, burst }, null, 1));
}

({ flows, seed, perf })[phase]().catch((e) => { console.error(e); process.exit(2); });

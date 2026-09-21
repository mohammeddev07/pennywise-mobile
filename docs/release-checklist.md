# Release checklist (P2.3)

Status of Phase 2 verification for the mobile app. Everything below was run in this environment; where something
could **not** be run, it says so and lists it under [Not tested](#6-not-tested-explicit) or [Blockers](#7-blockers-and-owner-actions).
Nothing here deploys, merges or migrates production data - those stay owner actions.

**Verdict:** every defect found by the web/API verification is fixed and re-verified. Phase 2 is **not signed off for
release** until the native passes in §6 are done (no iOS/Android device or emulator exists here) and the owner items
in §7 are closed. Nothing found so far is an unresolved correctness or web-accessibility blocker.

---

## 1. Environment and build types

| Item | Value |
| --- | --- |
| Host | WSL2 on Windows; Node **v26.8.1** / npm 11.19 (project `engines` is `>=20.19.4 <23` - see blocker B7) |
| Mobile build under test | `expo export --platform web`, production bundle, **`EXPO_PUBLIC_MOCK_API=false`, `EXPO_PUBLIC_API_BASE_URL=/api`** (real API, same-origin proxy). Screenshots/a11y use the mock build (`MOCK=true`) for deterministic fixtures |
| Browser | Chromium headless-shell 1243 (Chrome for Testing) via `playwright-core`, DPR 2 |
| Backend | pennywise `bootJar` (Spring Boot, Windows JVM **Java 21**), `ENV=production`, `APP_SECURITY_AUTH_ENABLED=true`, random 64-hex `APP_JWT_LOCAL_SECRET`, Swagger/OpenAPI off |
| Database | PostgreSQL **16.15** (embedded binaries, throwaway data dir), Flyway migrations applied |
| Docker | **Not available** (Docker Desktop not running, no WSL integration) - Testcontainers suites skipped, see §3 |
| Network | Chromium (WSL) -> local proxy -> Windows loopback/host-only NIC -> JVM. "0ms" runs add nothing; "150ms" runs add a fixed 150 ms to every `/api` call in the proxy |
| API latency (warm) | see §4.2; server and DB are on the same machine, so these are **service** times, not mobile-network times |
| Native device/emulator | **none** |

---

## 2. Reproducible commands

```bash
# --- static + unit (mobile repo) ---------------------------------------------------------------
npm ci                                   # lockfile: package-lock.json (npm; tracked)
npx tsc --noEmit                         # typecheck            -> clean
npx jest                                 # 17 suites, 111 tests  -> pass
npx expo install --check                 # -> "Dependencies are up to date"
npx expo-doctor                          # -> 21/21 checks passed
npm run release:check                    # release-config gate (fails unless prod env is set, see §8)

# --- backend (pennywise repo), Java 21 ---------------------------------------------------------
#   Windows JDK 21 gradle wrapper; PW_TEST_DB_URL points the query ITs at a local PostgreSQL when Docker is absent
PW_TEST_DB_URL='jdbc:postgresql://127.0.0.1:54329/postgres?user=postgres' ./gradlew cleanTest test
./gradlew bootJar

# --- real-API verification ---------------------------------------------------------------------
API_BASE=http://<host>:8080/api STATE=/tmp/pw-state.json node scripts/release/api-flows.cjs flows   # 31 functional checks
API_BASE=... STATE=... node scripts/release/api-flows.cjs seed     # 10,000-row synthetic ledger, 60 categories
API_BASE=... STATE=... node scripts/release/api-flows.cjs perf     # warm p50/p95 per request type
API_BASE=... STATE=... BACKEND_BAT=<bat that starts the jar> node scripts/release/cold-start.cjs

# --- browser runs -------------------------------------------------------------------------------
MOCK=false API_BASE=/api scripts/ui-shots/build-web.sh /tmp/web-real     # real-API bundle
scripts/ui-shots/build-web.sh /tmp/web-final                             # mock bundle (fixtures)
ROOT=/tmp/web-real TARGET=http://<host>:8080 STATE=/tmp/pw-state.json VIEWPORT=phone SHOTS=docs/release/shots node scripts/release/ui-real.cjs
ROOT=... VIEWPORT=wide LATENCY=150 ... node scripts/release/ui-real.cjs
node scripts/release/a11y-web.cjs /tmp/web-final docs/release/a11y-web.json docs/release/shots
```
`playwright-core` on `NODE_PATH` and (on this WSL box) the libnspr4/libnss3/libasound directory on `LD_LIBRARY_PATH`
are needed for the browser scripts. Raw output of every run is in `docs/release/results/`.

---

## 3. Static, dependency and test results

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npx jest` | **17 suites / 111 tests pass** (90 Phase 1 + 21 added in P2.x: design-system/contrast/states, Activity table + offline, release-config gate, table sort) |
| `npx expo install --check` | was 13 patch mismatches -> **up to date** |
| `npx expo-doctor` | was **19/21** (13 SDK-57 patch mismatches + `expo-modules-core` installed directly) -> **21/21** |
| Backend `gradlew test` (Java 21) | **203 tests, 0 failures, 11 skipped.** Skipped = the 3 Testcontainers suites that need Docker: `ApplicationTests` (1), `TransactionExportIntegrationTest` (1), `TransactionInvariantsIntegrationTest` (9). They must run in CI/Docker - blocker B2 |
| `npm audit --omit=dev` | 27 -> **25** (1 critical, 4 high, 18 moderate, 2 low), all build-tooling transitives - blocker B4 |

Dependency changes (minimal, `package.json` + `package-lock.json` only):
- `expo install --fix`: `expo ~57.0.24`, `expo-router ~57.0.22`, `expo-blur/-constants/-document-picker/-file-system/-font/-haptics/-linear-gradient/-linking/-secure-store/-splash-screen` and `@expo/metro-runtime` to the SDK 57 patch set. **Patch level only.**
- removed `expo-modules-core` (unused; doctor: must not be installed directly).
- `axios` 1.16.1 -> 1.20.0, **in the existing `^1` range**: 10 advisories (prototype pollution, form-serializer DoS, ...) all fixed `<1.18`; it is the app's only runtime HTTP client.
- Not touched: everything else, and no `npm audit fix` (it would add/replace `@expo/cli`, `ws`, `glob`, `semver`... - build tooling; owner decision B4).

---

## 4. Real-backend results

### 4.1 API flows (`api-flows.cjs flows`, 31/31 pass; expected values computed from the client's own ledger copy)

signup/login (wrong password 401, tampered token 401, no token 401) - two books with different currencies, book-switch
isolation (other book sees 0 rows) - create x240, **idempotent replay returns the same row** - edit with `If-Match`
(version +1, `createdAt` unchanged) - **stale-version edit -> 412 `ETAG_MISMATCH`, nothing changed** - duplicate - delete
(stale -> 412, current -> ok, then 404) - **all 26 sort modes** (13 fields x ASC/DESC: 200, amount/date correctly ordered),
three-key sort - advanced filter `(cat IN) OR cash AND amount BETWEEN AND note IS NULL` = independent count (36 = 36) -
text `CONTAINS` = independent count - analyze totals = independent sums, **YEAR buckets sum = MONTH buckets** - category
and month drill-down return exactly the counted rows - export/query returns a valid `.xlsx`.

Findings from this run (not app bugs, but owner-relevant):
- **Export -> import is not round-trippable for untitled rows** (B5): exporting 36 rows and importing the file into a new
  book imported 24 and rejected 12 with `MISSING_REQUIRED_FIELD: Description`. The add flow allows a blank title; import requires one.
- `POST /v1/auth/logout` does not exist and answers **500** (should be 404). The app never calls it (logout is client-side, JWT is stateless).
- Swagger disabled by env answers **500** on `/swagger-ui/index.html` (should be 404).

### 4.2 Warm-server latency - 10,000 rows, 60 categories, 60 samples each after 2 warm-ups (engineering target p95 < 500 ms)

| request | p50 ms | p95 ms | max ms | p95 < 500 |
| --- | --- | --- | --- | --- |
| search: first page, default sort | 8 | 217 | 222 | yes |
| search: deep page (offset 9950) | 16 | 18 | 18 | yes |
| search: sort amount DESC | 12 | 13 | 13 | yes |
| search: sort category name ASC | 14 | 16 | 17 | yes |
| search: category + amount range | 5 | 6 | 6 | yes |
| search: text CONTAINS | 21 | 22 | 23 | yes |
| search: category IN (20) | 7 | 8 | 12 | yes |
| analyze: MONTH, 4y window | 25 | 31 | 35 | yes |
| analyze: YEAR, 4y window | 25 | 28 | 31 | yes |
| analyze: MONTH + type filter | 24 | 26 | 28 | yes |

30 overlapping searches finished in 189 ms. The 217 ms p95 of the first row is a single first-sample spike (max 222,
p50 8), not a distribution. Creating 10,000 rows took 15.9 s (629/s, concurrency 8, p95 15 ms). These are engineering
targets met on a same-host loopback; they are **not** a statement about production or mobile networks.

### 4.3 Cold start - measured separately (`cold-start.cjs`, JVM killed and restarted)

| step | ms |
| --- | --- |
| JVM start -> `/actuator/health` UP | 5,227 |
| first login (bcrypt + JWT) | 200 |
| first search (10,000 rows) / second search | 83 / 25 |
| first analyze | 109 |
| first export/query (10,000 rows -> xlsx, 726 KiB) | 852 |

This is JVM + pool + first-query cost only. The Render free-tier spin-down the client retries for (45 s retry ladder in
`client.ts`) is a different, longer wake-up and cannot be measured here.

### 4.4 Client behaviour against the real API (`ui-real.cjs`, all steps pass)

(Phone = 23/23 on the final bundle. The wide +150 ms run predates one last cosmetic change - the sign on `AmountInput` - and was not repeated.)

Dataset: **10,007 rows**, 60 categories (some 40+ chars), 4 years of dates. Build: production web bundle, Chromium
headless. Network: loopback (0 ms added) and +150 ms per call. Both viewports: 390x844 and 1280x800.

| what | phone, +0 ms | wide, +150 ms |
| --- | --- | --- |
| login through the UI -> Home | 226 ms | 827 ms |
| first Activity load | **one page: 50 of 10,007** | 50 of 10,007 |
| 20 s of scrolling (21 pages) | DOM rows 25-27, JS heap 25 -> 35 MB | DOM rows 28-29, 34 -> 51 MB |
| duplicate paging requests | **0** (23 searches, offsets unique per filter) | 0 |
| N+1 | **none**: 3 analyze calls vs 23 pages; **0 per-row GETs** | same |
| 20 rapid filter clicks | 12 searches / 8 analyzes; final UI total = API total (8,996) | 19 / 20, **36 requests cancelled in flight**; final total matches |
| typing "Title 12" @40 ms/key | key-to-paint p50 23 / **p95 27 ms**, 0 long tasks, **1** search | p95 26 ms, 2 searches |
| 60-category sheet | opens in 69 ms, one selection = one refetch | 78 ms, 2 |
| worst case: scroll the whole ledger | **10,007 rows via 200 page requests in 23 s; heap 48 -> 93 MB; DOM rows still 27** | 52 s; 49 -> 98 MB; DOM rows 30 |

Reading: rows are virtualized and requests are bounded by what the user scrolls - the client never downloads the ledger
unprompted. **Memory is linear in pages loaded, not capped** (react-query keeps every page; ~45 MB per 10k rows on
web). That is bounded by the ledger, but a phone scrolling 100k rows would grow; a `maxPages` window is a follow-up (B6),
deliberately not done here because it interacts with scroll restore after drill-down.

### 4.5 UI flows on the real API (all pass on both viewports)

login -> details opens with the amount first -> **stale version**: another writer bumps the row while the edit form is
open; Save is refused, the conflict card explains it, the server row is unchanged; **Keep my changes** then **Save**
applies the edit (version 0 -> 2) -> **Duplicate** creates a second row -> **Delete** shows a labelled confirmation
("Delete this transaction? <title · amount> will be removed...") and removes exactly one -> **category drill-down**
from Insights lands on exactly the counted rows (188 = 188) -> **offline**: an explained error with Retry appears at
once, and Retry recovers without a reload -> **sign out** returns to login, deletes the token, leaves the persisted
filter store empty, and shows no account data.

Custom-date modal and "non-responsive action" scenarios: the four `CustomRangeSheet` and the details-menu race are
covered by the jest suites (Android dialog opened once, no re-open on re-render, UTC-safe dates, reversed range,
iOS single spinner, web `<input type=date>`), and the details "More actions" menu (Duplicate, Delete) was driven
through real clicks above. **Native pickers were not run** (§6).

Screenshots: `docs/release/shots/` (`phone-*`/`wide-*`: home, activity-deep, categories-60, details, conflict, insights,
drilled, offline; `a11y-*`: one per audited screen; `a11y-zoom200-*`).

---

## 5. Accessibility

Automated web audit on 18 screen states (`a11y-web.cjs`, mock fixtures, 390 and 1280 wide). Results:
`docs/release/a11y-web.json`.

| criterion | result |
| --- | --- |
| **Text contrast, WCAG AA** (computed from rendered colours, 434 text nodes) | **0 failures**; 4.5:1 normal / 3:1 large. Gradient-backed labels (primary button) are excluded by the script and covered by the token test: ink on green 8.6:1 |
| Touch targets >= 44px | **0 failures** on 16 of 18 states. Remaining: the 12 Insights bars are 22 px wide (12 columns on a 390px phone) - **accepted**, every bar has an equivalent ("Show as table", per-category rows); the sheet scrim strip "Close" (24 px) is redundant with the 48 px X button |
| Accessible names | **0 unnamed** interactive elements after fixing the field wrapper |
| Non-colour cues | every red/green amount carries `+`/`−` (**0 colour-only figures**; the amount entry on Add/Edit was colour-only and now prints the sign and announces "Expense $…"); selected chips/segments expose `aria-selected`; sort headers show an arrow; the edit screen's Expense/Income toggle names the kind |
| Tab order vs reading order | header actions -> date chips -> quick filters -> rows in order -> tab bar; focus ring on 30/30 stops |
| Focus containment / return / Escape | 40 Tab presses inside an open sheet: **0 escapes**; Escape closes it and **focus returns to the opener** ("Categories") |
| Reduced motion | `prefers-reduced-motion: reduce`: **0** running animations after opening Insights vs 12 without the preference |
| Text scaling (browser zoom 1.3 / 1.5 / 2.0 as a proxy) | no horizontal overflow and no hard-clipped text on Activity, Insights, Edit; long text ellipsizes. Details at 200% overflows by 68 px (header: Back + title + Edit + "…" needs ~260 px) - **known**, only reached at extreme scale |

Defects found by this pass and fixed **in shared primitives first**:
1. `FormField`: only the 21 px text line was tappable inside the 56 px field -> the whole field focuses the input (and the wrapper is not a tab stop).
2. `TrendAreaChart` day labels were 24 px tall targets -> 44.
3. `TrendChart` bars: a zero bar was a 1 px tall target -> each bar spans the plot height.
4. `AmountInput` (Add + Edit): the entered amount was red/green with no sign -> prints `−`/`+` and has an accessible label.
5. `HapticPressable`/`IconButton`/chips/fields: names, roles and states (P2.1); `Sheet` Escape (P2.2).

Web-only proxy: **this does not replace VoiceOver/TalkBack.** Labels, roles, states and order were added and inspected in
the DOM/aria tree, not listened to.

## 6. Not tested (explicit)

- **iOS and Android, entirely**: VoiceOver/TalkBack reading order and announcements; native date/time pickers; Android hardware back
  through sheets and routes; soft-keyboard avoidance (login, edit, add, filter sheets, `KeyboardAvoidingView` inside `Modal` on Android);
  FlashList recycling and scroll restore on real devices; haptics; `cssInterop`/`outline` styling from P2.1; sheet swipe-to-dismiss on
  touch; OS font scaling / Dynamic Type; safe-area insets on notched devices; landscape; real-device memory and frame times.
- **Import and export through the UI**: the document picker and the share/save sheet are native; on web `exportQueryToDevice` /
  import have no browser path. Both were exercised only at the API level (§4.1).
- Backend Testcontainers suites (11 tests, B2); real mobile-network latency; production/Render cold start.
- Custom-date modal was covered by jest, not driven in a browser.
- Real-device biometric/PIN unlock.

## 7. Blockers and owner actions

| # | Item | Why it matters | Action |
| --- | --- | --- | --- |
| B1 | Native passes in §6 not done | Phase 2 cannot be called complete without them | run on one iOS + one Android device (or emulators); tick the list in §6 |
| B2 | 11 backend tests need Docker (Testcontainers) | not executed here | run `./gradlew test` in CI/Docker |
| B3 | **EAS production env vars unverifiable from the repo** | `eas.json` says `environment: production`; the values live in EAS | set `EXPO_PUBLIC_API_BASE_URL=https://<host>/api`, **do not** set `EXPO_PUBLIC_MOCK_API`; `npm run release:check` (also the `eas-build-pre-install` hook) fails the build otherwise |
| B4 | `npm audit`: 25 vulns remain (1 critical `shell-quote`, 4 high `xmldom/browserslist/form-data/picomatch/ws`, ...) | build/CLI tooling, not in the app bundle; `npm audit fix` churns `@expo/cli` | owner decision; prefer an Expo SDK patch bump over `audit fix` |
| B5 | Export -> import not round-trippable for untitled rows | data-shape inconsistency between export and import (§4.1) | decide: import accepts blank description, or export fills it, or the add flow requires a title |
| B6 | Activity keeps every loaded page in memory (linear, ~93 MB at 10k rows on web) | large ledgers on low-RAM phones | consider react-query `maxPages` + scroll-restore rework |
| B7 | Verified on **Node 26.8.1**, project engines `>=20.19.4 <23` | EAS uses its own Node; a green run here is not a green run there | re-run `npm ci && npx jest` on Node 22 |
| B8 | Backend: CORS preflight is **401** (no `http.cors()` in `SecurityConfig`), `app.cors.allowed-origins` defaults to `*`, and no `exposedHeaders` | native apps are unaffected; a **browser-served** web build calling a different origin will not work | fix before shipping web; keep the same-origin proxy until then |
| B9 | Backend: unknown routes (`/v1/auth/logout`, disabled Swagger) answer 500 not 404 | noise in error dashboards | map `NoResourceFoundException` to 404 |
| B10 | iOS `UIFileSharingEnabled` + `LSSupportsOpeningDocumentsInPlace` are true | exposes the app's Documents folder in Files | confirm this is wanted for export files |

## 8. Release configuration verification

| Check | Result |
| --- | --- |
| Backend refuses the committed dev JWT secret outside local mode | **verified**: `ENV=production` without `APP_JWT_LOCAL_SECRET` fails at startup (`app.security.jwt.local-secret must be overridden outside local auth-disabled mode`) |
| Backend auth on in production mode | **verified**: `ENV=production` -> no token 401, tampered token 401, health public; `auth-enabled` defaults true unless `ENV=local`; `DEPLOYMENT.md` says never set it false |
| Swagger/OpenAPI in prod | env-disabled (`SPRINGDOC_*=false`) works (answers 500, B9); default is **enabled** - must be set in the host env |
| Mock mode absent from a release bundle | **fixed and verified**: `client.ts` now `require`s the mock lazily, so with `EXPO_PUBLIC_MOCK_API` unset the whole in-memory backend (seed data, `mock-access-token`, `__pennywiseMockBackend`) is dropped: the string `mock-access-token` occurs **0** times in the MOCK=false bundle (was 1) |
| Release env gate | `scripts/release/check-config.cjs` (+ jest test, + `eas-build-pre-install`): fails on mock=true, unset / localhost / example / cleartext-http API URL, missing `/api` path, cleartext-traffic flags in `app.json` |
| Client API default | still falls back to `http://localhost:8080/api` when the variable is unset - now caught by the gate, not by the client |
| Tokens | stored via `expo-secure-store`; logout drops the token and empties the persisted filter store (verified in the browser, §4.5) |

Web-specific defects found and fixed while doing the above (all were dead or misleading on web, working on native):
`Alert.alert` is a no-op on web, so **Log out, Delete category, Delete book and Import confirmations never appeared** -
now `alertCompat` (`confirm.ts`); react-query paused fetches while `navigator.onLine` was false, so **offline Activity
sat on "updating" forever** - `networkMode: "always"`; Save stayed enabled while a conflict reload was in flight and
re-hit the 412 - disabled during reload.

## 9. What was not done, on purpose

No deployment, no merge to `develop`/`main`, no production data migration, no change to the backend repository (findings
only), no dependency upgrade beyond what `expo-doctor` and the axios advisories required.

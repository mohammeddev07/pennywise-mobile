## 1. Stack

| Concern              | Version / implementation                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| Expo SDK             | `expo ~54.0.32` (SDK 54)                                                                                   |
| React Native         | `0.81.5`                                                                                                   |
| TypeScript           | `~5.9.2`; `tsconfig.json` has `strict: true`                                                               |
| NativeWind           | `^4.2.1` with Tailwind `^3.4.19`                                                                           |
| Navigation           | `expo-router ~6.0.22`; React Navigation Native `^7.1.8`, Bottom Tabs `^7.4.0`, Native Stack `^7.3.16`      |
| State                | Zustand `^5.0.10`, persisted with AsyncStorage `2.2.0`; React Query `^5.90.20` for balance/summary queries |
| HTTP                 | Axios `^1.16.1`                                                                                            |
| Secure token storage | `expo-secure-store ~15.0.8`                                                                                |

Node is pinned to `20.19.4` in `.node-version` (`package.json` allows `>=20.19.4 <23`).

## 2. App Structure

```text
src/                                      App source root
src/app/                                  Expo Router routes and root providers
src/app/(auth)/                           Welcome, login, signup, redirect-only PIN route
src/app/(onboarding)/                     Currency onboarding and redirect-only legacy routes
src/app/(tabs)/                           Home, transactions, analytics, categories, settings
src/app/modals/                           Modal routes
src/app/modals/add-transaction/           Multi-step transaction creation routes
src/features/                             Zustand feature stores
src/features/analytics/                   Empty folder
src/features/auth/                        Auth/session store
src/features/books/                       Book store
src/features/budgets/                     Budget store
src/features/categories/                  Category store
src/features/onboarding/                  Transient onboarding store
src/features/settings/                    Settings store
src/features/transactions/                Transaction cache and draft store
src/shared/                               Shared code
src/shared/api/                           Axios client and endpoint wrappers
src/shared/hooks/                         Empty folder
src/shared/session/                       Account-epoch race protection
src/shared/theme/                         Empty folder
src/shared/types/                         API DTOs and app models
src/shared/ui/                            Shared UI support
src/shared/ui/components/                 Reusable visual components
src/shared/ui/state/                      Toast store
src/shared/ui/theme/                      Tokens and unused nav theme
src/shared/ui/types/                      Legacy declaration file
src/shared/ui/utils/                      Unused date/sleep helpers
src/shared/utils/                         Currency and legacy money helpers
```

## 3. Screens

| Screen                   | File path                                 | Route name                           | Status (complete / partial / placeholder) | Real data or mock?                                                                                                                                                                                                                                                                 |
| ------------------------ | ----------------------------------------- | ------------------------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root resolver            | `src/app/index.tsx`                       | `/`                                  | complete                                  | Validated auth state; routes to login, currency onboarding, or Home.                                                                                                                                                                                                               |
| Welcome                  | `src/app/(auth)/welcome.tsx`              | `/(auth)/welcome`                    | complete                                  | Static navigation only.                                                                                                                                                                                                                                                            |
| Login                    | `src/app/(auth)/login.tsx`                | `/(auth)/login`                      | complete                                  | Real `POST /v1/auth/login`.                                                                                                                                                                                                                                                        |
| Sign up                  | `src/app/(auth)/signup.tsx`               | `/(auth)/signup`                     | complete                                  | Real `POST /v1/auth/signup`.                                                                                                                                                                                                                                                       |
| PIN                      | `src/app/(auth)/pin.tsx`                  | `/(auth)/pin`                        | placeholder                               | Redirect only; legacy hard-coded PIN UI remains on disk but is not routed.                                                                                                                                                                                                         |
| Currency onboarding      | `src/app/(onboarding)/currency.tsx`       | `/(onboarding)/currency`             | partial                                   | Creates/uses one real book and `PATCH /v1/me`; opening balance edit after creation is unsupported by backend.                                                                                                                                                                      |
| Legacy book onboarding   | `src/app/(onboarding)/books.tsx`          | `/(onboarding)/books`                | placeholder                               | Redirects to currency; legacy UI is unreachable.                                                                                                                                                                                                                                   |
| Legacy finish onboarding | `src/app/(onboarding)/start-tracking.tsx` | `/(onboarding)/start-tracking`       | placeholder                               | Redirects to currency; legacy UI is unreachable.                                                                                                                                                                                                                                   |
| Home                     | `src/app/(tabs)/home.tsx`                 | `/(tabs)/home`                       | complete                                  | Real balance/monthly summary; cached transactions/budgets; no fake trend or percentage.                                                                                                                                                                                            |
| Transactions             | `src/app/(tabs)/transactions.tsx`         | `/(tabs)/transactions`               | partial                                   | Real cached API page; clearly labeled as latest loaded records (first 100 only). Range now includes Today/7 Days/Month/Recent, plus a client-side, book-scoped category filter (chip row with a dismiss affordance) — both filter over the already-loaded cache, no new endpoints. |
| Insights                 | `src/app/(tabs)/analytics.tsx`            | `/(tabs)/analytics`                  | partial                                   | Real current-month summary and expense-category breakdown only.                                                                                                                                                                                                                    |
| Categories               | `src/app/(tabs)/categories.tsx`           | `/(tabs)/categories`                 | complete                                  | Real categories, current-month budgets, and server monthly spend.                                                                                                                                                                                                                  |
| Settings                 | `src/app/(tabs)/settings.tsx`             | `/(tabs)/settings`                   | partial                                   | Real cached email, real currency PATCH, book rename, and sign-out; opening balance is read-only due to backend contract.                                                                                                                                                           |
| Legacy book switcher     | `src/app/modals/book-switcher.tsx`        | `/modals/book-switcher`              | placeholder                               | Redirects to Settings; no UI entry point.                                                                                                                                                                                                                                          |
| Budget editor            | `src/app/modals/budget-editor.tsx`        | `/modals/budget-editor`              | complete                                  | Real budget PUT/DELETE; expense categories only; visible errors.                                                                                                                                                                                                                   |
| Category editor          | `src/app/modals/category-editor.tsx`      | `/modals/category-editor`            | complete                                  | Real create/update/delete; visible errors.                                                                                                                                                                                                                                         |
| Transaction details      | `src/app/modals/transaction-details.tsx`  | `/modals/transaction-details?id=:id` | complete                                  | Cached transaction plus real duplicate/delete; visible errors.                                                                                                                                                                                                                     |
| Edit transaction         | `src/app/modals/edit-transaction.tsx`     | `/modals/edit-transaction?id=:id`    | complete                                  | Real PATCH, current returned version retained, visible errors.                                                                                                                                                                                                                     |
| Add transaction flow     | `src/app/modals/add-transaction/*.tsx`    | `/modals/add-transaction/...`        | complete                                  | Real categories and real POST with idempotency key; draft fields are local until review.                                                                                                                                                                                           |

## 4. Navigation

`src/app/_layout.tsx` uses an Expo Router root `Stack` with `Stack.Protected` guards:

```text
unauthenticated -> (auth) -> welcome | login | signup
authenticated + onboarding incomplete -> (onboarding) -> currency
authenticated + onboarding complete -> (tabs) -> home | transactions | analytics | categories | settings
authenticated + onboarding complete -> modals -> add flow | edit/details | category | budget
```

Boot waits for SecureStore hydration and `GET /v1/me`. Data bootstrap does not load books/categories/transactions/budgets until validation succeeds. Tabs use Expo Router `Tabs` with `GlassTabBar`; modal routes use a nested `Stack` presented modally. PIN, book-list onboarding, start-tracking, and book-switcher URLs remain as redirect-only compatibility routes. No active screen is unwired.

## 5. Components

Used shared components: `NumericKeypad.tsx`; `AmountInput.tsx`; `OdometerAmount.tsx`; `AppText.tsx`; `Button.tsx`; `Card.tsx`; `CategoryIcon.tsx`; `CharacterWidget.tsx`; `EmptyState.tsx`; `GlassTabBar.tsx`; `HapticPressable.tsx`; `IconButton.tsx`; `Input.tsx`; `PinDots.tsx` (legacy PIN only); `RingProgress.tsx`; `Screen.tsx`; `SectionHeader.tsx`; `SegmentedControl.tsx`; `SelectRow.tsx`; `Sheet.tsx`; `Skeleton.tsx`; `SummaryStat.tsx`; `SwipeUpToSubmit.tsx`; `TransactionRow.tsx`; `UndoToast.tsx`.

Orphaned (no imports outside their own file): `src/shared/ui/components/ActionRow.tsx`, `MetricCard.tsx`, `ScreenHeader.tsx`, `StreamingText.tsx`, `TextField.tsx`, `TipCard.tsx`, `src/shared/ui/theme/navTheme.ts`, `src/shared/ui/utils/date.ts`, `src/shared/ui/utils/sleep.ts`, and `src/shared/utils/money.ts`. `BookPill.tsx` is now orphaned after single-book conversion. The legacy confetti declaration remains, but its package was removed.

## 6. State & Data Layer

- `src/features/auth/store.ts`: SecureStore token (`access_token`); persisted profile/onboarding state; `validateSession()` calls `getMe()`; `logout()` clears SecureStore, all persisted AsyncStorage keys, all persisted Zustand stores, and transient drafts/toasts.
- `src/features/books/store.ts`: persisted books and selected ID; takes first returned book, creates one if none; only one book is exposed.
- `src/features/categories/store.ts`, `budgets/store.ts`, and `transactions/store.ts`: persisted API caches. Successful mutations replace cached objects with complete API responses, including new `version` values.
- `src/features/settings/store.ts`: persisted primary currency.
- `src/shared/session/accountEpoch.ts`: blocks late API responses from a signed-out account from repopulating caches.
- `src/app/_layout.tsx`: React Query provider and gated data bootstrap. Queries are used for balance and monthly summary; Zustand owns entity caches.

There is no mock API client. AsyncStorage is a cache, not the source of truth. Cached content can remain visible while an already-authenticated session is offline; cold offline boot signs out because token validation cannot succeed.

## 7. Backend Integration

`src/shared/api/client.ts` uses Axios with `Authorization: Bearer <SecureStore token>`. Base URL is `process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api"`: environment-configurable, but the committed fallback is only suitable for a local emulator/server. No deployed URL is committed.

| Method / endpoint                                   | Calling file                              | Request / expected response                                                                    |
| --------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `POST /v1/auth/signup`                              | `shared/api/auth.ts`                      | `{email,password,defaultCurrencyCode?}` -> `{accessToken,tokenType,expiresInSeconds,user}`     |
| `POST /v1/auth/login`                               | `shared/api/auth.ts`                      | `{email,password}` -> auth response above                                                      |
| `GET /v1/me`                                        | `shared/api/auth.ts`, auth store          | -> `{id,email,defaultCurrencyCode,createdAt}`                                                  |
| `PATCH /v1/me`                                      | `shared/api/auth.ts`, onboarding/settings | `{defaultCurrencyCode}` only -> updated profile                                                |
| `GET /v1/books`                                     | `shared/api/books.ts`                     | -> `{items: BookResponse[]}`                                                                   |
| `POST /v1/books`                                    | `shared/api/books.ts`                     | `{name,currencyCode,timezone,openingBalanceMinor}` -> BookResponse                             |
| `PATCH /v1/books/:id`                               | `shared/api/books.ts`                     | `{name}`, `If-Match: "version"` -> BookResponse                                                |
| `DELETE /v1/books/:id`                              | `shared/api/books.ts`                     | `If-Match` -> empty; unused in UI                                                              |
| `GET/POST/PATCH/DELETE /v1/books/:id/categories...` | `shared/api/categories.ts`                | category DTOs; PATCH/DELETE use `If-Match`; list -> `{items}`                                  |
| `GET/PUT/DELETE /v1/books/:id/budgets...`           | `shared/api/budgets.ts`                   | `month=YYYY-MM`, `{amountMinor}` for PUT, `If-Match` when updating/deleting; list -> `{items}` |
| `GET /v1/books/:id/balance`                         | `shared/api/summary.ts`                   | -> `{bookId,currencyCode,balanceMinor}`                                                        |
| `GET /v1/books/:id/summary/monthly?month=YYYY-MM`   | `shared/api/summary.ts`                   | -> `{bookId,month,currencyCode,incomeTotalMinor,expenseTotalMinor,byCategory[]}`               |
| `GET /v1/books/:id/transactions`                    | `shared/api/transactions.ts`              | query `{from?,to?,type?,categoryId?,q?,limit?,cursor?}` -> `{page:{items,nextCursor}}`         |
| `POST /v1/books/:id/transactions`                   | `shared/api/transactions.ts`              | transaction DTO plus required `Idempotency-Key` -> TransactionResponse                         |
| `PATCH/DELETE /v1/books/:id/transactions/:txId`     | `shared/api/transactions.ts`              | PATCH partial transaction DTO or DELETE; `If-Match` -> response/empty                          |

DTO shapes are defined in `src/shared/types/api.ts`. Backend error parsing accepts the deployed nested shape `{ error: { code, message, details, requestId } }`. A 401 response interceptor clears the session and routes to login, except for `/v1/auth/*` calls to avoid a loop.

## 8. Styling & Design

NativeWind v4 is configured through `global.css`, `tailwind.config.js`, `babel.config.js`, `metro.config.js`, and `nativewind-env.d.ts`. The app loads Inter and uses `src/shared/ui/theme/tokens.ts`.

`UI_CONTRACT.md` specifies the light palette, Inter type scale, fixed spacing/radius scales, shared primitives, and loading/error/empty/success states. The implemented app substantially follows the light palette, cards, tabs, sheets, typography, skeletons, empty states, and shared components. It is not a documented pixel-perfect implementation: some screen-local layout styling remains, the transfer design references in `Light_design/` are intentionally not built, and legacy routes remain on disk. `assets/icon.png`, `assets/adaptive-icon.png`, and `assets/splash-icon.png` are real PNGs and are configured in `app.json`.

## 9. Build & Run

```sh
fnm exec --using=20.19.4 -- npm ci
cp .env.example .env
# Set EXPO_PUBLIC_API_BASE_URL to the reachable HTTPS API URL including /api.
fnm exec --using=20.19.4 -- npm run android
```

Useful checks:

```sh
fnm exec --using=20.19.4 -- npx tsc --noEmit
fnm exec --using=20.19.4 -- npx expo export --platform android --output-dir /private/tmp/pennywise-export
```

Both checks passed during this audit. CI (`.github/workflows/super-linter.yml`) runs Node from `.node-version`, `npm ci`, and `npx tsc --noEmit`; it no longer invokes a nonexistent lint script.

`eas.json` now exists (added on `feat/mvp-gap-fixes`, see section 10) with `preview` (internal APK)
and `production` (app bundle) profiles; neither hardcodes an API URL, both rely on EAS
environment variables for `EXPO_PUBLIC_API_BASE_URL`. `android/` is still absent, so `expo
prebuild` has not been retained in this checkout; whether it was ever run is UNKNOWN — needs
manual check. `app.json` has Android `versionCode: 1`, icon/splash configuration, and now sets
`android.package: "com.mohammeddev07.pennywise"` (previously absent — chosen to be unique/
permanent for sideloaded APKs, not yet published to the Play Store). Local Android SDK/adb are
not installed on this machine, so a local Gradle release build cannot run here.

## 10. In-Flight Work

PR #6 (`codex/add-api-client-and-services`) is merged into `develop` at `7f6ac51` (merge commit
dated before this audit). It added Axios, DTOs, API wrappers, SecureStore-backed auth, and
API-backed entity stores. `develop` has since moved past this doc's original snapshot — e.g. `git
log` shows `48c8484` and other commits implementing session validation, single-book flow, mutation
errors, and numeric correctness landed and merged; this file's sections 1–9 have not been re-audited
against that state and may be stale outside of the branch-specific updates below.

**New**: `feat/mvp-gap-fixes` (branched off `develop`, pushed to
`github.com/mohammeddev07/pennywise-mobile/compare/develop...feat/mvp-gap-fixes`, no PR opened yet
— no `gh` CLI available when it was pushed). Two commits:

- Transactions screen: adds the 7-day range and category filter described in section 3.
- `app.json`/`eas.json`: adds the Android package id and EAS build profiles described above.

`npx tsc --noEmit` passed with zero errors on this branch (`node_modules` was reinstalled fresh via
`npm install` first; `package-lock.json` was unchanged, so no dependency versions moved).

## 11. Gaps vs. Target State

- [x] Sign up screen — Done: real API signup in `src/app/(auth)/signup.tsx`.
- [x] Login screen — Done: real API login in `src/app/(auth)/login.tsx`.
- [x] Token storage (SecureStore / AsyncStorage) and auth persistence — Done: token in SecureStore; profile/onboarding cache in AsyncStorage; boot validates token with `GET /v1/me`.
- [x] Auth-guarded navigation (logged-out vs logged-in stacks) — Done: `Stack.Protected` guards in `src/app/_layout.tsx`.
- [x] Add expense form (amount, category, date, note, cash-in/out toggle) — Done: real POST flow; default payment method is internal-only `CASH` and not displayed.
- [x] Edit expense — Done: real PATCH with type/category/date/note/title/amount and version replacement.
- [x] Delete expense — Done: real DELETE, no fake local undo, visible errors.
- [x] Expense list screen — Done: real cache-backed list. Scope note: latest 100 loaded records only.
- [x] Running balance display — Done: Home renders only server `balanceMinor`.
- [x] Date filters (today / 7 days / month / custom) — Done on `feat/mvp-gap-fixes`: Today, 7 Days, Month, and Recent (all-loaded) chips, all computed client-side over the loaded transaction cache; there is still no arbitrary custom range picker.
- [x] Category filter — Done on `feat/mvp-gap-fixes`: book-scoped category chip row on the Transactions screen, filtering the already-loaded cache client-side; no new endpoint was needed.
- [x] Category management screen — Done: real CRUD and visible backend errors.
- [ ] Summary / breakdown view — Partial: exact current-month totals and expense-category breakdown; no income-category breakdown or selectable range.
- [x] Loading states — Done: primary flows use skeleton/loading UI.
- [x] Error states and user-facing error messages — Done for API mutations and primary summary/balance loading; background bootstrap errors remain retryable through UI rather than silently changing data.
- [x] Form validation — Done for auth lengths, category name, transaction title/note, amounts, categories, and currency precision.
- [x] Empty states — Done: primary tabs and editors use `EmptyState`.
- [ ] API base URL configurable per environment — Partial: `EXPO_PUBLIC_API_BASE_URL` and `.env.example` exist, but the real deployed URL and build-profile value were not supplied.

## 12. APK Build Readiness

- `eas.json` now exists (`feat/mvp-gap-fixes`) with a `preview` profile (`distribution: internal`,
  `android.buildType: apk`, `environment: preview`) and a minimal `production` profile
  (`android.buildType: app-bundle`, `environment: production`). Neither was run — EAS cloud builds
  still require an Expo account and project/credential setup, and account ownership is UNKNOWN —
  needs manual check. Before running `eas build --profile preview --platform android`, the
  `EXPO_PUBLIC_API_BASE_URL` value must be set per-environment via `eas env:create --environment
preview --name EXPO_PUBLIC_API_BASE_URL --value "<url>"` (and again for `production`), since the
  profiles deliberately don't hardcode it.
- `app.json` now sets `android.package: "com.mohammeddev07.pennywise"` (previously absent) — the
  permanent package id the readiness list below used to be blocked on.
- No current dependency requires a custom dev client. The native modules used (SecureStore, DateTimePicker, Gesture Handler, Reanimated, Screens, SVG, splash screen) are Expo SDK-compatible, so Expo Go remains viable for day-to-day Android testing.
- To produce a signed APK via EAS: run `eas build --profile preview --platform android` after the
  env vars above are set; EAS will manage build credentials/signing unless a release keystore is
  explicitly configured. Increment `versionCode` for later APKs.
- A free local alternative is viable after Android SDK/Build Tools, a supported JDK, generated
  `android/`, and release signing are available: `npx expo prebuild --platform android`, then
  `cd android && ./gradlew assembleRelease`. It needs no EAS cloud build or Expo account. It is not
  currently runnable on this machine because Android SDK/adb and an `android/` directory are absent.

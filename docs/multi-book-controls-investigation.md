# Multi-book controls: investigation and follow-ups

Base: develop `580e80c` (includes real-API enablement from PR #29).
Branch: `feature/multi-book-controls`.

## Track 1: why the controls "did nothing"

All four handlers were wired (X, Add, Manage, Delete). Nothing was stubbed and no route was missing. Web runtime checks confirm each one works. Three things explain what a real user saw:

1. **Silent X during a slow write.** `BookEditor.closeEditor` returned early while `isManaging` was true. On Render's free tier a cold start holds a write (plus the `loadBooks` reconcile inside `manage()`) for 30-60s+. For that whole time the X, backdrop, and Android Back did nothing, and every management button was disabled with no explanation. **Fixed:** closing is always allowed. The write keeps going, and a failure after close falls back to the toast.
2. **Errors hidden behind the modal.** Failures went to the root toast, which renders under the RN `Modal`. **Fixed in `d89c9aa`:** errors render inside the active sheet.
3. **The current book could not be managed from the switcher.** The selected row showed only a checkmark, with no ⋯ menu. Delete and rename were therefore unreachable for the book you were in, which with one book is every book. **Fixed:** every row has the menu.

The Move up/Move down buttons are removed from the book menu. Reordering is drag-only in Profile, and screen readers keep the adjustable increment/decrement actions.

Regression tests: `src/features/books/__tests__/sheets.test.tsx` (X while a write runs; current-book menu, no move buttons).

## Device checklist (gesture and modal behaviour Jest cannot cover)

Record platform, build, and update ID first.

1. Switcher: X, backdrop, Android Back. Repeat several times, and confirm no invisible overlay blocks taps afterwards.
2. Airplane mode or a cold backend: Add book → Create, then tap X while it spins. The sheet closes, and if the create fails a toast appears.
3. Switcher → ⋯ on the *current* book → Delete (use a disposable book).
4. Profile → Cash books with 3+ books: long-press the handle and drag. The other rows slide aside live, with a tick per slot, and the drop lands where previewed. A failed reorder snaps back and shows a toast.
5. Appearance → Light / Dark / System. Check the tab bar blur, date pickers, alerts, and the keyboard. **System only follows the device after a new `eas build`**, because `app.json` `userInterfaceStyle` changed from `dark` to `automatic` (a native change, so OTA cannot deliver it). Light and Dark work over OTA.
6. Insights: toggle Months/Years quickly. Old figures dim with "Updating…" and never collapse to skeletons.

## Track 2 status

| Item | State |
| --- | --- |
| Drag-to-reorder | Done with Gesture Handler + Reanimated. No new dependency needed. |
| Animations | Insights toggles, the Add-transaction type toggle, and Activity's Custom range now use calm 160ms timing with no press bounce (`6970a80`). The Insights skeleton flash on Months/Years is removed. |
| Light/Dark | System / Light / Dark in Profile → Preferences. |
| Display name | Device-local (settings store, cleared on logout). **Backend has no name field** (`MeResponse` = id, email, defaultCurrencyCode, createdAt). A synced name needs a paired backend change: a `display_name` column, a `MeResponse.displayName` field, and `PATCH /me` support. |
| Avatar | Generated, seeded, blinking face. Tap it to draw a new one. |
| Home | Hero balance card with income/spent and a spent-of-income bar; sections grouped in cards. |
| Activity sort | "Newest first / Oldest first" toggle on the "Showing X of Y" line. It reverses the whole sort. |
| Insights pie | Category donut (`c642496`). |
| Caching | Plan below. Not changed yet. |
| Google login | Plan below. Blocked on native build + OAuth client IDs. |

## Caching plan (frontend)

Current state: TanStack Query with a global `staleTime` of 10s, `retry: 0`, and placeholder data within a book. After any transaction write, `invalidateBookQueries` refetches everything for that book, including balance, summary, budgets, and analysis.

Proposal:
- Raise `staleTime` per query family instead of globally. Keep 10s for lists and analysis. Use ~5 min for books, categories, and `/me`, which change only through this app's own writes, and those already invalidate.
- Keep the invalidate-on-write model. The frontend never trusts its cache after its own write, so it can only disagree with the backend if the **backend** serves a stale cached response to the refetch.
- Contract the backend cache must meet: any write to a book's transactions, budgets, or categories evicts that book's cached balance, summary, analysis, and budget entries *before* the write's HTTP response returns. If eviction is asynchronous, the app's immediate refetch can repopulate the old value.
- Pull-to-refresh and app foreground (`focusManager` + `AppState`) trigger `refetchQueries` for the active book. That covers edits made on another device, which no invalidation reaches.

## Google sign-in plan

The backend is merged and token-based: `POST /v1/auth/google { idToken }` → the usual `AuthResponse`, plus `POST /v1/auth/google/link` for signed-in users. It verifies the audience against `GOOGLE_CLIENT_IDS` (Render env).

Mobile needs:
1. A native Google sign-in module. `expo-auth-session` custom-scheme redirects are no longer accepted for Android OAuth clients, so the realistic choice is `@react-native-google-signin/google-signin` with its config plugin. **New native dependency → new `eas build`.**
2. Google Cloud OAuth clients: a Web client ID (passed as `webClientId`, so the ID token's audience matches) and an Android client registered with the package `com.mohammeddev07.pennywise` and the **EAS keystore SHA-1** (`eas credentials`). Add the Web client ID to `GOOGLE_CLIENT_IDS` on Render.
3. A `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in EAS env vars; a "Continue with Google" button on login/signup; `authApi.google(idToken)` → the same session path as email login.

## Insights: what it shows, and the next small step

It shows net, income and spent for a window, a monthly/yearly trend bar chart, the category breakdown with a donut, and the largest expense. All of this comes from one `/analyze` call.

The smallest meaningful improvement, with no AI: a **"vs previous period" delta** on net, spent, and each category (for example "Groceries +32% vs August"), computed from the buckets `/analyze` already returns. After that, an average-per-day spend with a "projected month-end" line. Either one answers "is this normal?", which the tab can't answer today. An LLM layer would be a separate architecture decision (provider, cost, latency, privacy).

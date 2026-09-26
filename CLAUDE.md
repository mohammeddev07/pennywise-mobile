# Working agreement for this repo

These are the conventions this project actually follows. Read this before branching, committing, or touching CI/EAS config.

## Stack

- Expo SDK 57, React Native 0.86, TypeScript (`strict: true`), NativeWind/Tailwind, `expo-router`.
- State: Zustand (persisted to AsyncStorage) + TanStack Query for server data.
- Backend: separate Spring Boot repo, Postgres, deployed on Render's free tier.
- OTA updates: `expo-updates` + EAS Update.

## Branching and commits

- Branch off `origin/develop` — always fetch first and branch fresh, don't stack a new feature on top of an old, possibly-already-merged feature branch.
- Name branches `feature/<kebab-case-description>` or `fix/<kebab-case-description>`.
- Conventional commit prefixes: `feat`, `fix`, `chore`, `docs`. Imperative mood. Explain *why* in the body when it's not obvious from the diff.
- Open a PR into `develop`, not `main`.
- Even a one-line CI fix goes through a branch + PR — a direct push to `develop` once merged *ahead of* a real fix, and the fix silently never shipped. Branches make that visible in review.

## Before opening a PR

- `npx tsc --noEmit` must be clean.
- `npx jest` must pass.
- Don't add a dependency if the standard library, an already-installed package, or a native platform feature already covers it.

## Code style

- Reuse existing shared components for a UI shape that already exists (`FilterChip`, `SettingsRow`, the toast pattern in `src/shared/ui/state/` + `src/shared/ui/components/*Toast.tsx`) instead of hand-rolling a new one.
- Icon names must exist in `src/shared/ui/components/Icon.tsx`'s whitelist — check before using a new one; TypeScript will reject anything not listed.
- Keep user-facing copy short. One line beats a paragraph.
- Smallest diff that fixes the root cause. If a bug lives in a shared function, fix it there once — not in every caller that happens to trip over it.

## EAS Update (OTA)

- Run `eas update` with **both** `--channel <name>` and `--environment <name>` (matching `preview` or `production`). `--environment` is what makes the published JS bundle pick up the same `EXPO_PUBLIC_*` values the native build gets from EAS's Environment Variables page — without it, the OTA bundle silently falls back to hardcoded defaults. This broke the app in production once already.
- A channel must be **linked to a branch** on expo.dev (`eas channel:edit <name> --branch <name>`) before any update published to that branch actually reaches a device. Publishing succeeds either way — the failure is silent until a real device checks for updates and gets a rejected/opaque error.
- OTA only ships JS/asset changes. Any native change (new native module, Expo SDK bump, new permission) needs a fresh `eas build` and a new APK install — no way around it.
- The `EAS Update (OTA)` GitHub Action is manual (`workflow_dispatch`). When you've just pushed a workflow fix, run it from the branch that actually has the fix — the "Run workflow" dropdown defaults to `develop`, not your branch.

## Environment variables — two separate systems

- `EXPO_PUBLIC_*` (frontend/client) live in the **EAS project's Environment Variables page** on expo.dev, scoped per environment (`preview` / `production`). This is what both `eas build` and (with `--environment`) `eas update` read from.
- Backend config (`DB_PASSWORD`, `JDBC_URL`, `GEMINI_API_KEY`, JWT secrets, etc.) lives in **Render's Environment tab** and stays there. Never copy a backend secret into a GitHub Actions secret unless a workflow specifically needs to call the DB or a third-party API directly — right now, none do.
- `.env` files are gitignored except `.env.example` (template only, never real values). Keep it that way.

## Backend behavior worth knowing

- Render's free tier spins the backend down after ~15 min idle; the next request cold-starts in 30-60s. `src/shared/api/client.ts` already handles this (a timeout + one automatic retry at a longer timeout, plus honest "waking up the server" copy on login). Don't strip this out to "fix" a slow first request — that's expected given the hosting tier, not a bug.
- Gemini model IDs get deprecated over time. If the AI filter feature (`Describe your filter`) starts 404ing, check Render's logs for the `Gemini call failed: model=..., httpStatus=...` line before assuming it's a code bug — it's usually a stale `AI_MODEL` value.

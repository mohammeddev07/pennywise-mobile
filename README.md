# PennyWise

**A not-so-boring cash management app.** Track spending, manage budgets, and understand where your money actually goes — with a fast, native mobile experience and an AI assistant that turns plain English into a real filter.

![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Zustand](https://img.shields.io/badge/State-Zustand-orange)
![EAS Update](https://img.shields.io/badge/OTA-EAS%20Update-4630EB)

## Why it's different

- **Ask instead of filter.** Type "groceries over $50 last month" into *Describe your filter* and Gemini turns it into a structured query you review and apply — no digging through dropdowns for a question you already know how to ask.
- **Multiple books, one app.** Track personal and shared finances separately, switch between them without losing context.
- **Budgets that mean something.** Category-level budgets with real progress tracking, not just a running total.
- **Import and export that don't fight you.** Bring in transactions from `.xlsx`, export your ledger the same way.
- **Ships updates instantly.** In-app OTA updates via EAS Update — most fixes reach you the next time you open the app, no app-store wait.
- **Built for a real free-tier backend.** The app is honest about cold starts instead of pretending they don't exist: auto-retry with backoff and a clear "waking up the server" message instead of a spinner that lies to you.

## Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 57, React Native 0.86, `expo-router` |
| Language | TypeScript, `strict: true` |
| Styling | NativeWind (Tailwind for React Native) |
| State | Zustand (persisted) + TanStack Query |
| HTTP | Axios, with cold-start-aware retry logic |
| Auth | JWT, `expo-secure-store` for token storage |
| AI | Gemini, via a backend-mediated natural-language filter endpoint |
| OTA | `expo-updates` + EAS Update, published from GitHub Actions |
| Backend | Spring Boot + PostgreSQL, deployed on Render |

## Getting started

```bash
git clone <this repo>
cd pennywise-mobile
npm install
cp .env.example .env
```

Set `EXPO_PUBLIC_API_BASE_URL` in `.env` to your backend's URL (including `/api`). Requires Node `20.19.4` (see `.node-version`).

```bash
npm start
```

Expo inlines `EXPO_PUBLIC_*` values into the bundle at build/bundle time — they aren't read from the device at runtime. For an EAS build or an OTA update, the same variable must also be set on the [EAS project's Environment Variables page](https://expo.dev), scoped to the matching build/update environment.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run android` / `npm run ios` / `npm run web` | Start on a specific platform |
| `npm test` | Run the Jest suite |
| `npm run typecheck` | `tsc --noEmit` |

## Contributing

See [`CLAUDE.md`](./CLAUDE.md) for branching, commit, and CI/EAS conventions — that's the working agreement this repo actually follows, not just an aspiration.

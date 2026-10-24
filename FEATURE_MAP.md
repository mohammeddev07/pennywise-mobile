# PROJECT FEATURE MAP

## Navigation & Architecture Map
Use this index to instantly identify component locations, UI selectors, and verification routes.

### Example Feature: User Onboarding
- **Directory**: `src/features/onboarding/`
- **Entry Point**: `src/features/onboarding/OnboardingFlow.tsx`
- **DOM Selectors / Test Identifiers**:
  - Main Container: `[data-testid="onboarding-container"]`
  - Submit Button: `[data-testid="onboarding-submit"]`
- **Verification Command**: `npm test -- src/features/onboarding`

### Home snapshot / fast launch
- **Directories**: `src/features/home-snapshot/`, `src/features/auth/token.ts` (local JWT expiry check, `isTokenExpired`, used by `restoreSession`)
- **Entry Points**: `src/app/(tabs)/home.tsx` (`useHomeSnapshot` / `useSaveHomeSnapshot`); the `src/app/_layout.tsx` bootstrap (rehydrates the snapshot and token, then `restoreSession`)
- **Test IDs**: none
- **Storage key**: `pennywise_home_snapshot_v1` (cleared on logout, dropped per book in `purgeBookData`)
- **Verification Command**: `npx jest src/features/home-snapshot src/features/auth src/shared/api`

### HTTP startup and overload behavior
- **Transport**: `src/shared/api/client.ts`, shared by authenticated features.
- **Behavior**: launch/resume requests use one startup timeout; failures never automatically replay an HTTP operation.
- **Test IDs**: none; adapter call counts measure attempts.
- **Verification Command**: `npx jest src/shared/api/__tests__/coldStart.test.ts`

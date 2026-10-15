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

### Home snapshot (fast launch)
- **Directory**: `src/features/home-snapshot/`
- **Entry Point**: `useHomeSnapshot` / `useSaveHomeSnapshot`, used by `src/app/(tabs)/home.tsx`; rehydrated in `src/app/_layout.tsx` before the session restores
- **Storage key**: `pennywise_home_snapshot_v1` (cleared on logout, dropped per book in `purgeBookData`)
- **Verification Command**: `npx jest src/features/home-snapshot`

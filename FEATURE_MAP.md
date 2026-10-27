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

### App updates
- **Directory**: `src/features/app-updates/`
- **Entry Points**: `src/features/app-updates/useAppUpdates.ts`; startup in `src/app/_layout.tsx`, manual checks in `src/app/(tabs)/settings.tsx`, restart banner in `src/shared/ui/components/UpdateToast.tsx`.
- **Behavior**: shared check/download/restart state prevents competing requests; downloaded updates stay ready across screens; unavailable builds and failed downloads/restarts report their actual state.
- **UI selectors**: Settings text `Check for updates`; banner accessibility labels `Restart to apply update` and `Dismiss`.
- **Verification Command**: `npm test -- --runInBand src/features/app-updates`

### Shared bottom sheets and filter motion
- **Components**: `src/shared/ui/components/BottomSheetModal.tsx`, `FilterChip.tsx`, `SegmentedControl.tsx`.
- **Behavior**: sheets fade into their final position, reset drag state on visibility changes, and return from partial swipes without bounce. Filter chips keep their icons stationary; segmented controls default to calm motion.
- **UI selectors**: `sheet-drag-handle` view, `sheet-swipe` gesture, `Close` accessibility label.
- **Verification Command**: `npm test -- --runInBand src/shared/ui src/features/books src/features/transactions`

### Add-transaction categories
- **Directory**: `src/features/transactions/`
- **Entry Points**: `src/app/modals/add-transaction/details.tsx` (all eligible category chips), `src/app/modals/add-transaction/category.tsx` (searchable browser).
- **Behavior**: refreshes categories on entry and shows every active category for the draft's book and transaction type, without an eight-category cap.
- **UI selectors**: category chips expose their names as button accessibility labels; `Search categories` opens the full browser.
- **Verification Command**: `npm test -- --runInBand src/features/transactions/__tests__/addTransactionFlow.test.tsx`

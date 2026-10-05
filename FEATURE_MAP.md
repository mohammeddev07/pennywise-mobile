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
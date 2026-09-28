# Multi-book controls: Track 1 investigation

Base: develop `580e80c` (includes real-API enablement from PR #29).
Branch: `feature/multi-book-controls`.

## Implemented

- Book switcher/menu errors render within the native sheet, rather than only in the root toast behind its Modal.
- Delete failures preserve the book and display the authoritative server message in the current book menu. If that menu is no longer open, the normal toast remains the fallback.
- Busy management controls have an explanation. Closing the switcher remains available during operations.
- Six full-sheet tests cover header/backdrop dismissal and reopening, Manage navigation, switcher-to-create, menu-to-edit, busy controls, and confirmation followed by deletion failure.

## What remains unresolved

The reported native X/Add/Manage/Delete tap failures have not been reproduced. All handlers exist. Web runtime checks on the latest develop mock export verified X dismissal, Manage navigation, Profile creation, and opening the delete menu. The browser session was interrupted before the delete confirmation was completed. This does not establish native correctness.

The X is within the header pan gesture region; editor transitions replace the modal component. These are investigation candidates, not established causes. Neither has been changed speculatively.

Existing Jest mocks replace native gestures and animations, so passing tests cannot validate touch delivery or modal presentation on a device. Affected platform and build identification are still needed. Local `xcrun simctl` is unavailable.

## Required device checks

On the affected build, record platform, app version/update, and exact first failing action:

1. Open switcher, tap header X; reopen, tap backdrop; repeat several times. On Android also test Back. Confirm no invisible overlay remains.
2. Open switcher → Add → close untouched form → reopen. Enter a draft, cancel discard, then confirm discard.
3. Open switcher → Manage books with Profile first unmounted, then already mounted. Confirm sheet dismissal, navigation, scroll, and focus.
4. Create a disposable book; open its menu; cancel deletion and verify retained data. Confirm deletion and verify deterministic fallback. Never use a real populated book as a test fixture.
5. Trigger an API validation/version/network failure and verify its message is readable inside the active modal.
6. While a write/import/export is active, verify blocked controls explain why and X remains usable on the switcher.
7. If changing shared sheet gesture/presentation code becomes necessary, retest Activity filters, custom date range, sort, and transaction date/time sheets for touch and keyboard regressions.

## Track 2 boundary

No Track 2 code changes are included. Visible reorder buttons, animations, themes, display names, sorting UI, caching policy, and Google login remain separate decisions. Native reorder actions should remain accessible when visible move buttons are removed. Backend display-name, cache-invalidation, and Google-auth contracts are still needed before committing to those integrations.

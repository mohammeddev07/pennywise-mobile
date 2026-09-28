# Multi-book UI implementation and verification

## Release boundary

New book switching, creation, styling, ordering, and deletion are available only with `EXPO_PUBLIC_MOCK_API=true`. Existing live single-book behavior remains available. Backend deployment has not been confirmed; do not remove this gate yet. No dependencies were added, no backend code was changed, and no deployment or merge was performed.

The feature follows the supplied layout: Home/Activity/Insights pills, switcher and editor sheets, and Profile Cash books management. It reuses the existing sheet, card, form, button, icon, confirmation, error, and toast components.

## Behavior

- A single coordinator handles every selection source, clears outgoing draft/import/notice state, cancels reads, refreshes destination data, and preserves applied account/book filters. Screen scope boundaries reset local UI state before the destination book renders.
- Management is serialized. Writes/imports/exports block switching. List reads cannot overwrite an in-flight mutation; uncertain outcomes must reconcile before another management write.
- Names are trimmed and checked at 1–80 characters; duplicates are allowed. Currency is picked from the approved uppercase list. Creation uses the device timezone with UTC fallback.
- Opening balances use a dedicated signed decimal-string parser and the existing currency exponent helper, including JPY and KWD. Blank means zero; excess precision, malformed numbers, and values beyond the safe integer range are rejected.
- Editing sends only changed name/icon/color fields. Unknown style keys receive display-only defaults and a development warning.
- Reorder uses installed Gesture Handler/Reanimated plus accessible move actions and visible Move up/Move down menu buttons. Failure rolls back and reconciles; selection remains stable.
- Deletion explicitly warns that the book and all its transactions become inaccessible. It preserves local data until server success, checks the confirmed version again, purges scoped caches, and chooses the first remaining server-ordered book.
- Mock handlers model ownership, versions, soft deletion, category seeding, ordering, computed balances, the ten-book cap, and last-book enforcement. Opening balance is excluded from income/spending totals.

## Dedicated colors

White icons use `#FFFFFF`. Tiles are opaque, without gradients. Every selected swatch uses a 2px `#00C805` ring and a 2px `#0B0D0F` gap. Selected icon cells use the same outline. Selection is also exposed through accessibility state. Category color tokens remain independent.

| Key | Fill | White contrast | Background contrast (`#0B0D0F`) |
| --- | --- | ---: | ---: |
| green | #16A34A | 3.2957 | 5.9070 |
| purple | #8B5CF6 | 4.2344 | 4.5976 |
| orange | #F06F15 | 3.0044 | 6.4797 |
| blue | #3B82F6 | 3.6779 | 5.2932 |
| red | #EF4444 | 3.7631 | 5.1733 |
| pink | #E46BAA | 3.0076 | 6.4729 |

Ring/background contrast is 8.5880. Automated tests verify each fill meets 3:1 against white and the dark background.

Existing book/airplane/home/car/cart whitelist mappings were verified. Minimal additions: Briefcase, Heart, Users, GraduationCap, MoreVertical, GripVertical. The picker contains nine icons; the image's more-icons and upload controls are omitted as approved.

## Save points and automated verification

Each of phases 1–6 passed typecheck and the full Jest suite before its local commit. The earlier local `expo-updates` installation issue was resolved before implementation verification; no source workaround was added.

| Phase | Commit | Full Jest result |
| --- | --- | --- |
| 1: contract, mocks, store | `1f6c8ef` | 20 suites / 136 tests |
| 2: pills and headers | `1eff9b9` | 21 suites / 139 tests |
| 3: transition coordinator | `8315e84` | 22 suites / 144 tests |
| 4: creation | `6fc3bfc` | 24 suites / 166 tests |
| 5: management/reorder | `f5b118a` | 25 suites / 170 tests |
| 6: deletion | `0cba57d` | 26 suites / 175 tests |
| Scope race follow-up | `1cd7cfe` | Included in final verification |
| 7: regression/accessibility | Final feature commit | 27 suites / 189 tests |

Final checks: `npm run typecheck`, `npm test -- --runInBand`, `git diff --check`, and the mock web export. The final run emitted one React `act(...)` warning in ActivityScreen; there were no failed tests. Jest uses the repository's existing forced-exit configuration; passing tests do not establish that every possible native lifecycle issue is covered.

## Preview checks actually performed

Used `scripts/ui-shots/build-web.sh` with mock mode and a 390×844 browser viewport. The existing script temporarily supplies a SecureStore web shim and restores it after export; it does not alter production auth code.

Verified through the UI:

- Mock sign-in and a visible pill with one book.
- Switcher balances and selected state.
- Creation with orange/airplane styling and a negative USD opening balance.
- Immediate selection of the new book, correct negative balance, and zero income/spending.
- Manage books navigation to Profile's Cash books section.
- Move up changes order and disables the boundary action.
- Unchanged edit Save is disabled; changing icon/color enables Save and persists the style.
- Phone-width Profile layout, white glyph tiles, and management controls.

## Device acceptance checklist (outstanding)

These checks were not performed on native iOS/Android devices:

- Cold start with one/multiple books, missing persisted selection, offline state, and delayed responses.
- Switch populated USD/JPY/KWD books across every tab; inspect rows, totals, budgets, categories, filters, chart selections, and animation state.
- Draft discard/cancel for transaction/category/budget forms and pending filter ranges.
- Creation boundaries, ten-book cap, negative amounts, decimal precision, and authoritative server errors.
- Native drag reorder, accessible increment/decrement, rollback under network failure, and rapid input suppression.
- Selected/nonselected/last-book deletion, version conflicts, and externally deleted books.
- Import-result ownership, logout cleanup, export/import switch blocking, and late callback suppression.
- VoiceOver/TalkBack focus return, announcements, large text, small screens, native keyboard visibility, and reduced motion.
- Existing live single-book regression flows after backend integration is approved.

## Limits and unchanged findings

- Real backend integration and actual server ownership enforcement remain unverified. Mock fixtures cannot prove either.
- Backend aggregate arithmetic overflow is outside mobile control; the client enforces the approved safe-integer opening-balance bound.
- Mock export round-tripping remains out of scope.
- `shared/utils/money.ts` is dead code with a wrong hardcoded currency exponent; this feature leaves it untouched and does not use it.
- Reordering supports dragging within the visible list and first-class move actions for the full list; edge auto-scroll is not implemented.

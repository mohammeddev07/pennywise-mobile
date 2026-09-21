# UI polish spec (P2.1)

Elevation of the current PennyWise UI, not a redesign. Identity is fixed: charcoal surface ladder,
`#00C805` accent, semantic income/expense colours, Schibsted Grotesk words, Sora amounts, Lucide icons,
existing radii and 4/8 spacing scale. No new palette, font or gradient was added; no navigation changed.

Companion files: `docs/design-system.md` (the contract, updated in this task), `scripts/ui-shots/` (the
screenshot harness), `docs/ui-polish/{before,after,compare}/` (evidence).

---

## 1. Method and skill status

| Input | Status |
| --- | --- |
| Source read | `tokens.ts`, `money.ts`, `tailwind.config.js`, `AppText`, `MoneyAmount`, `Button`, `Card`, `FormField` (+`Input`, `TextField`), `Sheet`, `BottomSheetModal`, `FilterChip`, `Screen`, `BottomNavigation`, `IconButton`, `HapticPressable`, `SegmentedControl`, `TrendChart`, plus Activity, Insights, Home, details, edit, add-flow and auth screens. |
| `ui-ux-pro-max` | **Installed and used** (v2.13.0). Queried `--stack react-native` (touch, keyboard, hitSlop, Pressable) and `--domain ux` (chip reflow, touch spacing), and applied its `pro-rules.md` checklist: 44pt targets, 4.5:1 text / 3:1 non-text, no layout-shifting press states, token-only colour, safe areas. |
| `taste` | Not installed under that name. The local **`design-taste-frontend`** skill is installed and was read in full where relevant. It states it is *not* for dashboards, multi-step forms or native mobile (its §13) and its examples are web CSS/shadcn/Tailwind v4. **Nothing was translated from it.** Only its platform-neutral rules were used: §11 redesign-preserve protocol (audit before touching, keep brand tokens, no silent IA change), §6 accessibility guardrails (reduced motion, contrast), and the "honor existing accessibility wins" rule. The visual critique itself was done directly on screenshots. |
| Screenshots | Web export of the mock-API build in headless Chromium. **No iOS/Android device or emulator exists in this environment** - see §9. |

---

## 2. Ground truth that changed the plan

1. **There is no 520px constraint in the code.** `tokens.layout.maxContentWidth = 520` was declared and never
   read by any file. At 820px (tablet) and 1280px (web) every screen, the form fields, the sheets and the tab
   dock stretched edge to edge (`before/wide-activity.png`, `before/tablet-add-details.png`). Nothing was
   "removed indiscriminately" - the constraint is *introduced* now, per screen (§7).
2. **`className` was silently dropped on every `HapticPressable`.** `HapticPressable` wraps
   `Animated.createAnimatedComponent(Pressable)`, a class NativeWind never registered. About 25 call sites
   relied on it, including ten `h-12 w-12 rounded-full border` back/close buttons that rendered as a bare
   20px chevron (`before/phone-details.png`, top-left) - a 20px touch target with no border or fill.
3. **`subtle` text failed contrast.** `#66707A` measures 3.63:1 on `surface`, 3.40:1 on `surfaceAlt`, 3.06:1
   on `surfacePressed`. It carried placeholders, field hints, axis labels and helper notes at 11-13px.
4. The docs contradicted the code in places (`docs/design-system.md` said key radius 18 vs code 22; "Ionicons only"
   vs Lucide; `Input` "compat wrapper" still shipping). Fixed in the same change.

### Contrast audit (WCAG 1.4.3 text ≥ 4.5:1)

| Foreground | on `app` | on `surface` | on `surfaceAlt` | on `surfacePressed` | Verdict |
| --- | --- | --- | --- | --- | --- |
| `text` #F5F7F8 | 18.1 | 17.1 | 15.9 | 14.4 | pass |
| `muted` #98A2AD | 7.5 | 7.1 | 6.6 | 6.0 | pass |
| `subtle` #66707A (old) | 3.9 | **3.6** | **3.4** | **3.1** | **fail** |
| `subtle` #7D8791 (new) | 5.3 | 5.0 | 4.7 | 4.2 | pass on resting surfaces |
| `accent` #00C805 | 8.6 | 8.1 | 7.6 | 6.8 | pass |
| `income` #51D99B | 10.9 | 10.3 | 9.6 | 8.6 | pass |
| `danger` #FF6B67 | 7.0 | 6.6 | 6.2 | 5.5 | pass |
| `warning` #F5A524 | 9.5 | 9.0 | 8.4 | 7.6 | pass |
| `onAccent` #0B0D0F on `accent` / `accentPressed` | 8.6 / 6.1 | | | | pass |

`subtle` moved to `#7D8791` - the same cool grey lifted, still 1.5+ ratio points below `muted` so the
text ladder still steps down. `surfacePressed` is a transient press fill, never a resting text ground.
Guarded by `src/shared/ui/__tests__/designSystem.test.tsx`.

Non-text contrast (WCAG 1.4.11), measured:
- Card/input hairline `stroke` on `surface` = **1.2:1**. **Accepted, not changed**: it is the brand's
  hairline-only depth language, fields are also identified by fill, label and placeholder, and the focus
  state (solid accent, 8.1:1) is well above 3:1. Flagged for the P2.3 device pass.
- Insights bars were `surfacePressed` on the card = **1.3:1** (data near invisible). Now `muted`@60% ≈ 3.8:1. **Fixed.**
- Sheet drag handle was `stroke` = 1.2:1. Now `muted`@50%. **Fixed.**

---

## 3. Ranked issue list

Severity: **A** blocks use or fails an accessibility floor · **B** visible defect / inconsistency ·
**C** polish. Status: ✅ fixed in P2.1 · ⏭ deferred (owner phase) · ◻ accepted.

| # | Sev | Issue | Evidence | Owner (code) | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | A | `className` dropped on `HapticPressable`; back/close buttons are 20px, unstyled, unlabeled | `before/phone-details.png` | `HapticPressable` (`cssInterop`), `IconButton` | ✅ root fix + 13 call sites migrated to `IconButton` |
| 2 | A | `subtle` text 3.4-3.6:1 | §2 table | `tokens.ts`, `tailwind.config.js` | ✅ `#7D8791` |
| 3 | A | Disabled `Button` faded twice (0.4 opacity over a muted label): "Clear" looked broken | `before/phone-sheet-amount.png` (Clear) | `Button`, `HapticPressable.disabledOpacity` | ✅ |
| 4 | A | Web focus: native square outline drawn inside a rounded field; field spilled into its neighbour (no `minWidth:0`); focus border 40% accent ≈ 2.5:1; no keyboard focus ring on any pressable | `before/phone-sheet-amount.png` | `FormField`, `HapticPressable` | ✅ |
| 5 | A | Insights bars ~invisible (1.3:1) and 12 month labels truncated to "A…", "S…" | `before/phone-insights.png` | `TrendChart` | ✅ |
| 6 | A | Screen-reader semantics: chips had no selected state; fields had no accessible name and errors were not announced; toast dismiss unlabeled and 40px; sheet titles not headers; `IconButton` fell back to the icon name as label | source | `FilterChip`, `FormField`, toasts, `BottomSheetModal`, `Sheet` | ✅ |
| 7 | B | `xs` (11px, +2 tracking, caps overline) used for ~30 sentence-case notes: spaced-out, hard to read, weakest colour | `before/phone-activity.png` ("Showing 3 of 3") | new `caption` variant in `tokens.ts` | ✅ 38 call sites moved |
| 8 | B | Web: Home hero balance truncated to "41,987...." (RNW ignores `adjustsFontSizeToFit`); Income/Spent stat blocks overlapped at 390px | `before/phone-home.png` | `HeroAmount` (`heroScale`), `StatBlock` (wrap) | ✅ |
| 9 | B | No width policy: forms, sheets, dock and Activity stretched to the window on tablet/web | `before/wide-activity.png`, `before/tablet-add-details.png` | `Container`, `Screen width=`, `Sheet`, `BottomSheetModal`, `BottomNavigation` | ✅ §7 |
| 10 | B | Bottom sheet showed a drag handle that did nothing, and the handle was invisible | source | `BottomSheetModal` | ✅ swipe-to-dismiss on existing Gesture Handler + Reanimated (§8) |
| 11 | B | Off-scale values: tab labels 10px; `BookPill` 46px; `Skeleton` radii 8/16/20; toast buttons 40px; Categories gutter 20 vs 24 everywhere else; search icon 22 vs 19; three files importing `@expo/vector-icons` directly | source | `tokens.layout.chipHeight`, `Skeleton`, nav, `categories.tsx` | ✅ |
| 12 | B | Insights spends 124px on two stacked segmented controls before any data | `before/phone-insights.png` | `analytics.tsx` | ✅ side by side |
| 13 | B | Tab dock on web: scrolling text showed through the nav labels (the blur only really works on iOS) | `before/phone-activity-filtered.png` | `BottomNavigation` | ✅ near-solid fill off iOS |
| 14 | B | Keyboard: login/signup had no keyboard avoidance (iOS) and no submit key on the password field | source | `login.tsx`, `signup.tsx` | ✅ code; **not device-verified** |
| 15 | B | Activity fixed header (3 chip rows + month stepper + totals) is ~62% of a 844px phone in a filtered state; the list gets 1-2 rows | `before/phone-activity-filtered.png` | `transactions.tsx` | ⏭ P2.2 - move totals+chips into the list header, collapse applied chips |
| 16 | B | Applied "Expenses" chip is green while the quick "Expenses" chip is red; both show at once | same | `transactions.tsx`, `filterModel` chip meta | ⏭ P2.2 |
| 17 | B | Advanced-filter condition header wraps chips beside three icon buttons on phone | `before/phone-sheet-advanced.png` | `AdvancedFilterSheet` | ⏭ P2.2 |
| 18 | C | Wide layouts have a cap now but no second column (Insights: chart beside categories; Activity: list beside detail) | §7 | Activity/Insights | ⏭ P2.2 |
| 19 | C | `pin.tsx` and `import-results.tsx` are not width-capped | source | those files | ⏭ (rare screens) |
| 20 | C | Hairline field border 1.2:1 | §2 | tokens | ◻ accepted, revisit P2.3 |

Deliberate non-fixes: expense-is-red everywhere (`money.ts`, product decision, untouched); emoji tofu in the
Home greeting is a screenshot-environment font gap, not an app bug.

---

## 4. Token and component ownership

One owner per concern. If a screen needs something the owner does not offer, the owner gets a prop - the
screen does not get a copy.

| Concern | Owner | Notes |
| --- | --- | --- |
| Colour, type scale, radii, spacing, heights, container caps, breakpoints | `theme/tokens.ts` (+ mirror in `tailwind.config.js`) | `subtle`, `caption`, `chipHeight`, `container`, `breakpoints` are new/changed |
| Money colour and sign | `theme/money.ts` + `MoneyAmount` | unchanged |
| Words / amounts font families and Android weight-by-family | `AppText` (`fonts` / `numerals`) | untouched - weight still travels through the family name |
| Every pressable: haptic, press feedback, disabled fade, web focus ring, `className` | `HapticPressable` | |
| Filled / quiet / danger button, inline text action | `Button`, `LinkButton` | `LinkButton` gained `tone`, `disabled`, a11y props |
| Circular icon action (back, close, add, more) | `IconButton` | the only one; 13 hand-rolled copies deleted |
| Text input | `FormField` | `Input` and dead `TextField` deleted, 12 call sites migrated |
| Chip / filter / category pick | `FilterChip` | 44px, `accessibilityState.selected` |
| Segmented switch | `SegmentedControl` | |
| Inline sheet (filters, pickers) | `BottomSheetModal` | width cap + swipe-dismiss |
| Route-level form/detail chrome | `Sheet` | different behaviour from `BottomSheetModal` (a full route with header/footer slots) - **kept separate on purpose** |
| Column width and gutters | `Container`, `Screen width=`, `useScreenPaddingX`, `useLayoutClass` | |
| Chart bars and axis | `TrendChart` (Insights), `TrendAreaChart` (Home) | |

### Consolidation log (only where behaviour matches)

| Removed / merged | Into | Call sites migrated |
| --- | --- | --- |
| `Input` (wrapper), `TextField` (unused) | `FormField` | 12 (`Input`), 0 (`TextField`) |
| 13 hand-rolled `HapticPressable className="h-12 w-12 … rounded-full"` icon buttons | `IconButton` | login, signup, budget/category/book editors, import, add-category, details, edit |
| 8 hand-rolled "accent text in a 44px pressable" actions | `LinkButton` | Home ×3, Insights ×3, Activity, add details |
| Direct `@expo/vector-icons` in 3 files | `Icon` | ExportToast, import-results, import-transactions |
| Ad-hoc `xs` sentence-case text | `caption` variant | 38 |

Not merged: `Sheet` vs `BottomSheetModal` (route vs inline), `TrendChart` vs `TrendAreaChart` (bars vs line),
`SegmentedControl` vs `TypeToggle` (TypeToggle is a fixed-colour mode switch).

---

## 5. Interaction states

Every state must be reachable from the shared component, not painted per screen.

| Component | rest | pressed | focus (keyboard, web) | selected | disabled | loading | error |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Button` primary | accent gradient + glow | 0.97 scale, deeper gradient | 2px inset accent ring | - | `surfaceAlt` fill, `subtle` label, no glow, **not faded** | spinner, swallows press, `busy` | - |
| `Button` secondary/danger | `surfaceAlt`/red-soft + hairline | `surfacePressed` | ring | - | `surface` fill, `subtle` label | spinner | - |
| `FilterChip` | `surfaceAlt`, hairline | 0.97 | ring | tone-tinted fill, 1.5px tone ring, bold label, `selected` | - | - | - |
| `FormField` | `surface`, hairline | - | **solid accent border**, no native outline | - | muted text, `editable=false` | - | danger border + message, live region |
| `IconButton` | `surface` circle + hairline | `surfacePressed` | ring | - | 0.4 (bare icon) | - | - |
| `LinkButton` | accent / muted text | 0.99 | ring | - | 0.4 | - | - |
| `SegmentedControl` | pill on `surface` | 0.98 | ring | sliding tinted thumb, `selected` | 0.5 | - | - |
| `BottomSheetModal` | 55% scrim, slides in | header drag follows finger | - | - | - | - | close on scrim tap, back button, swipe >96px or flick |
| Data surfaces | - | - | - | - | - | `Skeleton` (reduce-motion aware) | `EmptyState tone="danger"` + Retry |

Touch targets: chips 44, `IconButton` 48, `Button md/lg` 48/56, fields/segmented 56, toast dismiss 44,
`LinkButton` ≥44, list rows ≥56. Press feedback never changes layout bounds (scale/colour only).

---

## 6. Typography and amounts

- Words Schibsted Grotesk, amounts Sora - unchanged. `caption` (12/17, Schibsted medium, +0.1) is the only new
  step; it removes tracking that only makes sense in caps.
- **Amount baselines.** Where a label and an amount share a line (`StatBlock`, Activity "Net · 3 transactions",
  day-header net) the row uses `alignItems: "baseline"`; `MoneyAmount` sizes reuse the UI line heights so the two
  faces share a baseline. `StatBlock` now wraps (label drops under the figure) instead of colliding.
- **Hero amount.** `heroScale(glyphs)` steps the size down (1 → .82 → .7 → .58) so long balances stay on one line
  on web, where `adjustsFontSizeToFit` is not implemented; native fit-to-width still applies on top.
- **Icon alignment.** Icons in fields sit in a centring wrapper; row icons use `tokens.icon.row` (19), chip icons
  16, nav 22 (Categories search was 22).

---

## 7. Responsive layouts

`useLayoutClass()` → **compact** < 600 · **medium** 600-1023 · **expanded** ≥ 1024. Gutters 20 / 24 / 32.
Caps are outer widths (gutters included).

| Class | Width | Behaviour |
| --- | --- | --- |
| Compact phone | < 600 | Unchanged from today: full width, 24 gutter (20 under 360), dock inset 12. |
| Medium / tablet portrait | 600-1023 | Forms one 520 column, centred. Lists/settings 720. Analytical screens up to 1040 (fills the screen at 820 minus gutters). Dock and sheets capped at 520. |
| Expanded / wide web | ≥ 1024 | Same caps; content is centred with empty margins. **P2.2** adds the second column on Activity/Insights (§3 #18). |

### Per-screen container decisions

| Screen | Cap | Reason |
| --- | --- | --- |
| Login, Signup, Welcome, Onboarding (currency, books, start) | `form` 520 | Typed input; long lines hurt scanning. |
| Add flow (amount, details, success) | `form` 520 | Keypad and one-column form. |
| Route `Sheet` modals: transaction details, edit, category/budget/book editors, import, category picker | `form` 520 | Same; one place (`Sheet`) covers 7 screens. |
| `BottomSheetModal` (all filter/sort/date sheets) | `form` 520 | A 1280px filter sheet is unusable; centred at the bottom. |
| Tab dock | `form` 520 | Stays a pill. |
| Home, Profile, Categories | `content` 720 | Card and list pages: comfortable measure, room for the 2-col category grid. |
| Activity, Insights | `wide` 1040 | Tables/charts gain from room; P2.2 uses it for two columns. |
| `pin`, `import-results` | not yet capped | Rare screens (§3 #19). |

The 520 number itself was not moved: `tokens.layout.container.form` equals the old `maxContentWidth` and a test
pins them together.

---

## 8. Bottom sheet decision: `@gorhom/bottom-sheet`

**Not adopted.** The playbook allows it only against a reproducible missing capability.

| Candidate capability | Reproduced? | Result |
| --- | --- | --- |
| Swipe to dismiss | Yes - the handle was decorative | **Built** on the installed Gesture Handler + Reanimated (a Pan on the header strip; >96px or a flick closes, else spring back; nested body scroll is untouched because the pan is header-only). ~25 lines, jest-covered by the existing sheet suites. |
| Snap points / half-height | No screen needs one | n/a |
| Nested scrolling + gestures | Not reproducible: the only scrolling sheet uses a plain `ScrollView` under a header-only pan | n/a |
| Keyboard avoidance | iOS uses `KeyboardAvoidingView` (works). **Android inside `Modal` could not be checked** - no emulator here | Open item for P2.3 |

Also unverified: Gorhom's compatibility with RN 0.86.3 / Reanimated 4.5.1 / SDK 57 (an added dependency needs
`expo install --check` first, and the repo already fails that check on unrelated packages).

**Trigger to revisit (P2.3, on a device):** if the Android soft keyboard occludes the Amount or Advanced-filter
inputs, prototype Gorhom's `BottomSheetModal` on `AmountFilterSheet` only, and adopt it only if that fixes it.

---

## 9. What was verified, and what was not

Verified (this environment):
- `npx tsc --noEmit` clean.
- `npx jest`: 14 existing suites (90 tests) still pass, plus 15 new tests in
  `src/shared/ui/__tests__/designSystem.test.tsx` (contrast floors, hero scale, disabled/selected/error/disabled
  field semantics, container caps).
- Web export builds; before and after screenshots captured from the same fixture at 390×844, 820×1180, 1280×800.

**Not verified - do not read the above as covering these:**
- Any iOS or Android behaviour: `cssInterop` on the animated pressable, `outline*` styles, the sheet pan, the
  zero-loss `KeyboardAvoidingView` on auth, baseline alignment with Sora on Android, `includeFontPadding`.
  The web build is a proxy for layout, colour and contrast only.
- Screen-reader output (VoiceOver/TalkBack): labels/roles/states were added, not listened to.
- Dynamic Type / largest system font size, landscape.
- Reduced-motion: screenshots ran with `reducedMotion: reduce`, so entry animations are skipped in both sets.
- Newly styled `className` sites (a side effect of fix #1: e.g. `BookPill`, `SelectRow`, category-editor icon
  tiles now get the classes they always declared) were checked only where they appear in the screenshots.

---

## 10. Reproducing the baseline

```bash
# 1. build the mock-API web bundle (temporarily shims expo-secure-store on web, restores it on exit)
scripts/ui-shots/build-web.sh /tmp/web-before        # from the base commit
scripts/ui-shots/build-web.sh /tmp/web-after         # from the working tree

# 2. capture. Needs playwright-core on NODE_PATH and, on this WSL box, the libnspr4/libnss3/libasound
#    directory on LD_LIBRARY_PATH (see the mobile-web-e2e-setup note).
node scripts/ui-shots/shots.cjs /tmp/web-before docs/ui-polish/before
node scripts/ui-shots/shots.cjs /tmp/web-after  docs/ui-polish/after
node scripts/ui-shots/compare.cjs                    # docs/ui-polish/compare/*.png
```

Determinism: browser clock pinned to 2026-06-18T10:00Z (it still ticks), UTC timezone, `en-US`, DPR 2,
session pre-authenticated via localStorage, fixture rows injected into the mock backend synchronously at module
load (8 months of history plus a long-title row and a $12,480.50 row for stress). Screens: login (rest, focus,
errors), Home, Activity (default, filtered), Categories/Amount/Advanced sheets, Insights, transaction details,
edit (rest, focus), add (amount, details) × 3 viewports.

---

# P2.2 - screen polish

Same rules as P2.1: identity untouched, Phase 1 query/data behaviour untouched (same `useActivityFilters`,
`useActivityResults`, `filterStore`; the 90 Phase 1 tests pass unchanged apart from one layout-class stub).
Evidence: `docs/ui-polish/p22/{before,after,compare}/` - before = the P2.1 build, after = this change, same fixtures.

## Critique (`design-taste-frontend`, native-constrained)

The skill excludes native mobile and dashboards, so it was used as a checklist for its platform-neutral rules only
(hierarchy, honest empty states, reduced motion, no decoration that obscures data, preserve brand) - no web/CSS advice
was applied. Findings on the implemented screens, and what was done:

| Finding | Action |
| --- | --- |
| Activity: filter chrome + totals ate ~60% of a phone; type filter shown twice in two colours | Totals/applied chips/stepper scroll with the list; duplicate chip removed; filter count + Clear all beside the range |
| Tablet/web: a phone list stretched to 1040px reads as a void between description and amount | Aligned table with sortable headers |
| Details: decorative icon tile led; Created/Updated read as content; giant Done | Amount first, labelled rows, quiet "Added ·  Edited" line, one Edit button, back in the header |
| Insights: chart card lacks a way out of a selection | "Clear selection", category hint line, 2-line category names |
| Wide Activity: Spent/Received drift ~500px apart | capped at 560px |
| Insights Spending/Income labels sit tight in the thumb at 165px | **left as is** (fits, no clipping at 360/390); revisit if a longer label is added |
| Home hero/greeting emoji | untouched (product rule) |

## What changed

**Activity** - `transactions.tsx`, new `features/transactions/ui/ActivityTable.tsx`
- Phone: fixed = title + search/sort/export, one date row, one quick-filter row. Scrolling header = stale banner,
  applied chips, month stepper, totals, "Showing n of N". List rows keep the two-line layout + day headers + sort sheet.
- ≥600dp: table (Date, Description, Category, Payment, Amount). Header press = next sort on the shared state
  (same column flips, new column starts at its natural direction, date breaks ties); active column shows an arrow +
  `accessibilityState.selected`. No day headers (the Date column carries it). Only when content < 680px does the
  table scroll sideways.
- States: `ListEmptyComponent` renders loading skeleton / API error + Retry / empty book / no matches / empty range;
  `Showing saved results` banner when a refresh fails over cached rows; totals keep their skeleton (never a zero).
- Removed the per-revision `FadeIn` re-mount of the totals block (it re-animated on every filter change and search
  keystroke commit).

**Insights** - clear selection, drill-down hint, 2-line category names, saved-figures banner on failed refresh,
Home chart gets a value list as its accessible label (Insights already had "Show as table" and a per-bucket text line).

**Details** - amount, title, then Category / Payment / Date / Note rows; quiet metadata; header = Back, **Edit**, "…"
(Duplicate, Delete). Delete confirmation names the row: `"<title> · <amount> will be removed from your totals and
charts. This can't be undone."` No footer Done. Handlers (`onEdit/onDuplicate/onDelete`, the pending-action timer)
are the existing ones.

**Forms/overlays**
- Escape: `Sheet` (route level) closes the route on web unless a modal is open; RN `Modal` sheets close on Escape.
  Verified in headless Chromium: sheet closes, focus returns to the opening chip, Activity stays open.
- `BottomSheetModal`: `aria-modal`, header role, swipe-dismiss, fade instead of slide under reduced motion.
  Backdrop is a sibling of the panel, so panel taps never reach it.
- Draft kept on API errors (already true); errors now sit in the always-visible footer (add flow) or scroll into
  view (`useScrollToError`, edit/add). Save button shows a spinner but never replaces the form or blocks Back;
  axios' 15s timeout ends every spinner.
- Version conflict copy: "This transaction was changed while you were editing - another device or session saved a
  newer version, so your save was not applied. Your edits are still here. Reload latest replaces them; Keep my
  changes keeps them so you can save over the newer version."
- Login/signup: keyboard avoidance + password `returnKeyType="go"` submits.

**Motion** (`useReducedMotion`): count-up removed on first value and under reduced motion, no bar stagger, no press
scale, sheet fades. `useCountUp` no longer starts from 0 (false "$0.00" flash on Home).

## Verification matrix (before -> after captured for each)

| Dimension | Covered |
| --- | --- |
| Widths | 300 (1.3x large-text proxy), 360, 390, 820 (tablet), 1280 (wide) |
| Content | 62-char category, 75-char title, $12,480.50 row, 8-month history |
| Currency | USD (all), JPY and INR (Activity, Insights, details, edit, sheets @390) |
| States | default, filtered, no matches, first-load error (offline), stale rows + failed refresh |

Fixes made from those captures: table header moved onto the rows (was above the summary), duplicate totals Retry on
error removed. Made after the final capture run and therefore **not in the screenshots**: the 560px cap on the wide
summary and `ScreenHeader` title shrink-to-fit on native (a 300px layout truncated "Activity").

## Not verified

- No native run: FlashList in a fixed-width horizontal ScrollView (the 600-680dp table), Android back, the sheet pan,
  soft-keyboard behaviour, `outline`/`cssInterop` from P2.1. Web only.
- "Enlarged text" is a browser-zoom proxy (harsher than OS font scaling); real Dynamic Type / font scale untested.
- Focus return was checked for the Categories sheet only; native platforms handle it in the OS.
- Screen-reader output not listened to. Reduced-motion screenshots identical by design (the harness runs with it on).
- The "before" set cannot show the offline/stale states: the P2.1 build predates the mock's `offline` switch.

---

# P2.3 - see `docs/release-checklist.md`

Verification against the real API, the 10,000-row profile, the accessibility audit and the release blockers live in
`docs/release-checklist.md`. Changes made there that touch the design system: `AmountInput` prints the money sign,
`FormField` is fully tappable (and not a tab stop), chart targets are 44px, `Alert.alert` calls go through
`alertCompat` (a no-op on web before), and queries use `networkMode: "always"` so web fails fast offline like native.

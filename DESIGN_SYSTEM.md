# PennyWise Design System

The single contract for how PennyWise looks and behaves. It replaces the older
`UI_CONTRACT.md`. If a screen disagrees with this document, the screen is wrong.

Source of truth in code: **`src/shared/ui/theme/tokens.ts`**. Nothing below is
decorative prose — every value here exists as a token, and screens must read the
token rather than repeat the literal.

---

## 1. The three rules that keep this from drifting

The app previously drifted because three styling idioms coexisted and each
screen picked one. These rules end that.

1. **Never re-declare tokens locally.** A screen must not define
   `const COLORS = {...}`, `const SPACING = {...}` or `const RADIUS = {...}`.
   Import `tokens` and read `tokens.colors.x` / `tokens.space[4]` directly.
2. **Never hardcode a font family string.** `fontFamily: "Inter_600SemiBold"` is
   banned. Use `<AppText weight="semibold">`, or `fonts.semibold` for a raw
   `Text`/`TextInput`. On Android a named family makes `fontWeight` a no-op, so
   weight _must_ travel through the family — this is a correctness rule, not a
   preference.
3. **Never read a money color directly.** Income/expense color comes from
   `amountColor()` in `src/shared/ui/theme/money.ts`. Never
   `tokens.semantic.expense` at a call site.

Styling idiom: **NativeWind classes for static styling** (they map to
`tailwind.config.js`, which mirrors the tokens), **`tokens.*` in a `style` prop
for computed or dynamic values**. Both are correct; a local token re-map is not.

---

## 2. Color

### Core palette

| Token              | Value     | Use                                       |
| ------------------ | --------- | ----------------------------------------- |
| `app`              | `#F8FAFC` | Screen background                         |
| `surface` / `card` | `#FFFFFF` | Cards, rows, inputs, keypad keys          |
| `surfaceAlt`       | `#F3F7F4` | Inset panels, pressed keys, locked fields |
| `stroke`           | `#E6EAF0` | Every border and divider                  |
| `text`             | `#0B1220` | Primary text                              |
| `muted`            | `#7A8596` | Secondary text, icons, placeholders       |
| `accent`           | `#00C313` | Primary action, brand                     |
| `accentPressed`    | `#00A80F` | Pressed primary                           |
| `danger`           | `#FF4D57` | Destructive actions, errors               |
| `warning`          | `#F59E0B` | Warnings                                  |

Tints (`greenSoft` `#EAFBEA`, `redSoft` `#FFE9EA`, `amberSoft` `#FFF4DD`,
`blueSoft` `#EEF5FF`, `purpleSoft` `#F2EEFF`, `neutralSoft` `#F2F4F7`) back
status pills and icon tiles. Never use a tint as a text color.

### Money color — the one rule with teeth

| Meaning                         | Color           | Helper                   |
| ------------------------------- | --------------- | ------------------------ |
| Income amount                   | `#00C313` green | `amountColor("INCOME")`  |
| Expense amount                  | `#FF4D57` red   | `amountColor("EXPENSE")` |
| Balance / net, positive or zero | `text`          | `balanceColor(minor)`    |
| Balance / net, negative         | `#FF4D57` red   | `balanceColor(minor)`    |
| Untouched amount being typed    | `muted`         | `AmountInput` handles it |

**Expense is red everywhere** a signed amount is shown: transaction list, detail,
totals, add flow, success. A _balance_ is not an income or an expense — it stays
neutral when positive, because green on every positive balance is noise.

> **Known tension.** The reference mocks in `/Light_design` keep expenses
> near-black and reserve red for alerts (overspend, negative balance), which is
> the mainstream finance convention. Red-for-all-expenses was an explicit product
> decision. It is implemented through `amountColor()` alone, so reverting to the
> reference behavior is a one-line change in `money.ts` — do not scatter the
> decision back out into screens.

---

## 3. Typography

Inter, loaded in `src/app/_layout.tsx`. Weight is always carried by the family.

| Variant   | Size / line | Weight             | Use                                |
| --------- | ----------- | ------------------ | ---------------------------------- |
| `xs`      | 12 / 16     | medium             | Captions, meta, field labels       |
| `sm`      | 14 / 20     | medium             | Secondary text, chips, helper text |
| `base`    | 16 / 22     | regular            | Body, list titles, inputs          |
| `lg`      | 18 / 24     | semibold           | Card and sheet titles              |
| `xl`      | 20 / 28     | semibold           | Section headings                   |
| `2xl`     | 28 / 34     | bold               | Screen titles, amount recap        |
| `3xl`     | 40 / 46     | bold               | Tab screen titles                  |
| `amount`  | 48 / 54     | bold, tabular      | Money display                      |
| `display` | 60 / 66     | extrabold, tabular | Hero amount, add-flow step 1       |

`amount` and `display` set `fontVariant: ["tabular-nums"]` so digits do not
reflow while the keypad edits the value, and carry negative tracking so large
numbers stay optical rather than airy.

Weight override: `<AppText variant="base" weight="semibold">`. Available
weights: `light` `regular` `medium` `semibold` `bold` `extrabold`.

---

## 4. Spacing

Allowed values only: **`0, 4, 8, 12, 16, 20, 24, 32, 40`** — `tokens.space[0…8]`.
Anything else is a bug.

| Context                    | Value                  |
| -------------------------- | ---------------------- |
| Screen horizontal padding  | 24                     |
| Card padding               | 16 (24 for hero cards) |
| Dense row vertical padding | 12                     |
| Gap between form fields    | 24                     |
| Section gap                | 24                     |
| Chip / horizontal list gap | 8                      |
| Bottom tab clearance       | safe-area + 120        |

## 5. Radius

Allowed values only: **`8, 16, 24, 32, 9999`** — `tokens.radii`.

| Element                                 | Radius                 |
| --------------------------------------- | ---------------------- |
| Inputs, buttons                         | 16 (`md`)              |
| Cards, list containers                  | 24 (`lg`)              |
| Full-screen sheets                      | 32 (`xl`), top corners |
| Pills, chips, icon buttons, keypad keys | 9999 (`pill`)          |

## 6. Elevation

`tokens.elevation.{card,sheet,toast,tabBar}`. Soft and low-contrast — the light
theme carries depth with borders, not shadows. Never add a shadow inline.

## 7. Touch targets

Minimum 44×44. Icon buttons are 48×48. Buttons: `md` = 48 tall, `lg` = 56.
Rows are at least 56 tall, 64 when they carry a label plus a value.

---

## 8. Components

Use these. Do not write a screen-local copy of anything in this list — that is
exactly how the app drifted.

| Component                                          | Purpose                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| `Screen`                                           | Safe-area screen shell with padding and tab clearance             |
| `ScreenHeader`                                     | Tab-screen title / subtitle / action                              |
| `FlowHeader`                                       | Multi-step modal header with back, title, and progress track      |
| `Sheet`                                            | Modal shell with header, body, footer slots                       |
| `Card`                                             | White rounded container, `card` / `surface` / `soft` variants     |
| `Button`                                           | `primary` `secondary` `outline` `ghost` `danger`, sizes `md` `lg` |
| `AppText`                                          | The only text primitive — `variant`, `tone`, `weight`             |
| `Input`                                            | Labelled text field with error state, `default`/`search`/`pill`   |
| `TypeToggle`                                       | Expense/Income switch, colored by `amountColor`                   |
| `SegmentedControl`                                 | Pill segmented filter                                             |
| `TransactionRow`                                   | The transaction list row                                          |
| `SummaryStat` / `MetricCard`                       | Metric blocks                                                     |
| `CategoryIcon`                                     | Tinted circular icon tile                                         |
| `ActionRow` / `SelectRow`                          | Settings and detail rows                                          |
| `NumericKeypad`                                    | Circular light keypad                                             |
| `OdometerAmount`                                   | Animated money display                                            |
| `HapticPressable`                                  | The only pressable — never bare `Pressable`                       |
| `EmptyState` `Skeleton` `UndoToast` `RingProgress` | States and feedback                                               |

Every data-backed surface must render **Loading, Error, Empty and Success**.
Loading is `Skeleton`, never a bare spinner in a list.

---

## 9. Navigation rules

These exist because typing in a field used to navigate the user off the screen.

1. **Text input never navigates.** A title, name, note or search field is an
   in-page `TextInput`. It is never a pressable row that pushes a route.
2. **Only a genuine step change navigates.** In the add flow that means exactly
   three things: step 1 → step 2, the full category browser, and the native
   date/time picker.
3. **A flow states where you are.** Multi-step flows use `FlowHeader` with
   `step` and `totalSteps`.
4. **Back is non-destructive.** Returning to an earlier step preserves what was
   entered on the later one.

### Add-transaction flow

```
step 1  /modals/add-transaction          amount only, hero + keypad + type toggle
step 2  /modals/add-transaction/details  title, category, when, note  → saves
        /modals/add-transaction/success  confirmation
```

Pushed from step 2 when asked for, never automatically:
`/modals/add-transaction/category` (full browser) and
`/modals/add-transaction/datetime` (native picker).

---

## 10. Currency

**Currency belongs to the book, not the account, and is immutable.**

- Chosen once in `(onboarding)/currency.tsx`, stored as `book.currencyCode`.
- Every screen reads it through `useBookCurrency(bookId?)`. Never read
  `book.currencyCode ?? primaryCurrency` inline.
- `useSettingsStore.primaryCurrency` is a pre-book fallback only, and is not
  user-editable. Settings shows it as a locked, read-only row.

The reason it is immutable: `amountMinor` is stored with no exchange rate, so
switching currency would silently reinterpret every past transaction.

---

## 11. App icon

Icons are generated, not hand-exported. `npm run icons` runs
`scripts/generate-icons.js`, which rasterizes every asset from one vector
description so all sizes stay in sync.

| Asset                          | Size  | Notes                                                      |
| ------------------------------ | ----- | ---------------------------------------------------------- |
| `icon.png`                     | 1024² | Full bleed, opaque, square — the OS applies its own mask   |
| `adaptive-icon.png`            | 1024² | Android foreground, mark inside the 66% safe zone          |
| `adaptive-icon-monochrome.png` | 1024² | Android 13+ themed icon silhouette                         |
| `splash-icon.png`              | 1024² | Carries its own rounded tile (splash ground is near-white) |
| `favicon.png`                  | 48²   | Web                                                        |

Expo generates the per-density Android buckets and the full iOS icon set from
these sources at build time. To change the mark, edit the shape functions in
`scripts/generate-icons.js` and re-run — never edit a PNG by hand.

---

## 12. Review checklist

- [ ] No local `COLORS` / `SPACING` / `RADIUS` map
- [ ] No `"Inter_*"` string outside `tokens.ts` and `_layout.tsx`
- [ ] Money color via `amountColor` / `balanceColor`
- [ ] Currency via `useBookCurrency`
- [ ] Spacing and radius from the allowed sets
- [ ] Repeated patterns use a shared component
- [ ] Loading / Error / Empty / Success all present
- [ ] Text fields do not navigate
- [ ] `npx tsc --noEmit` passes

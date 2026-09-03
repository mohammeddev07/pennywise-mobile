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

PennyWise is **dark-first**. There is no light theme: `app.json` sets
`userInterfaceStyle: "dark"` so native chrome (pickers, alerts, splash) matches,
and `getNavTheme()` starts from `DarkTheme` so no white frame flashes between
screens.

### Elevation ladder

Four surfaces, and nothing in between. Depth is carried by surface color and a
hairline, never by a shadow.

| Token              | Value     | Use                                          |
| ------------------ | --------- | -------------------------------------------- |
| `app`              | `#0B0D0F` | Screen background                            |
| `surface` / `card` | `#121518` | Cards, rows, inputs, keypad keys             |
| `surfaceAlt`       | `#181C20` | Bottom navigation, toast, secondary buttons  |
| `surfacePressed`   | `#20252A` | Pressed state for any of the above           |
| `onAccent`         | `#0B0D0F` | Text/icons **on** brand green                |

### Text and hairlines

| Token     | Value       | Use                                        |
| --------- | ----------- | ------------------------------------------ |
| `text`    | `#F5F7F8`   | Primary text                               |
| `muted`   | `#98A2AD`   | Secondary text, inactive nav, icons        |
| `subtle`  | `#66707A`   | Tertiary: placeholders, axis labels, locks |
| `stroke`  | `#FFFFFF12` | Borders (7%)                               |
| `divider` | `#FFFFFF0F` | In-card separators (6%)                    |

### Brand and status

| Token           | Value     | Use                                   |
| --------------- | --------- | ------------------------------------- |
| `accent`        | `#00C805` | Primary action, active nav, selection |
| `accentPressed` | `#00A804` | Pressed primary                       |
| `income`        | `#51D99B` | Positive money                        |
| `danger`        | `#FF6B67` | Negative money, destructive, errors   |
| `warning`       | `#F5A524` | Warnings                              |

**Green is not decoration.** It marks a primary action, the active tab, a
selected control, or a positive state — nothing else. No glow on ordinary
buttons or cards.

Tints (`greenSoft`, `incomeSoft`, `redSoft`, `amberSoft`, `blueSoft`,
`purpleSoft`, `neutralSoft`) are 12% alpha washes rather than pastel fills, so
they sit correctly on any of the four surfaces. Never use a tint as a text
color.

Ripple: `colors.ripple` on dark surfaces, `colors.rippleOnAccent` on green ones.
Never hardcode a ripple color.

**Alpha and SVG.** Plain RN styles accept 8-digit hex. Reanimated's
`interpolateColor` and `react-native-svg` do not reliably — those must use
`withAlpha()` from `theme/color.ts`, which returns `rgba()`.

### Money color — the one rule with teeth

| Meaning                         | Color           | Helper                   |
| ------------------------------- | --------------- | ------------------------ |
| Income amount                   | `#51D99B` green | `amountColor("INCOME")`  |
| Expense amount                  | `#FF6B67` red   | `amountColor("EXPENSE")` |
| Balance / net, positive or zero | `text`          | `balanceColor(minor)`    |
| Balance / net, negative         | `#FF6B67` red   | `balanceColor(minor)`    |
| Untouched amount being typed    | `subtle`        | `AmountInput` handles it |

**Color is never the only signal.** Every semantic amount renders through
`MoneyAmount`, which prints a `+` or `−` alongside the color. Direction is
readable without perceiving hue.

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
| `xs`      | 12 / 16     | semibold, +tracking | Overlines, metadata, field labels  |
| `sm`      | 14 / 20     | regular             | Secondary text, chips, helper text |
| `base`    | 16 / 22     | regular             | Body; `weight="semibold"` for rows |
| `lg`      | 18 / 24     | semibold            | Card and section titles            |
| `xl`      | 20 / 28     | semibold            | Section headings                   |
| `2xl`     | 28 / 34     | bold                | Page titles, amount recap          |
| `3xl`     | 30 / 38     | bold                | Largest page title                 |
| `amount`  | 40 / 46     | bold, tabular       | Money display                      |
| `display` | 58 / 64     | bold, tabular       | Hero amount: balance, add step 1   |

`xs` is written in caps at the call site (`SectionHeader` does this for you) —
it is the overline, not small body text. There is no smaller variant: tiny
low-contrast grey text is banned.

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
| Screen horizontal padding  | 20 (16 under 360dp)    |
| Card padding               | 16 (20 for hero cards) |
| Dense row vertical padding | 12                     |
| Gap between form fields    | 24                     |
| Section gap                | 32                     |
| Chip / horizontal list gap | 8                      |
| Bottom tab clearance       | `useTabBarClearance()` |

Screens must not hardcode either the gutter or the tab clearance — take them
from `useScreenPaddingX()` and `useTabBarClearance()` (both exported by
`Screen`), so a small-handset tightening or a nav height change lands
everywhere at once.

## 5. Radius

Allowed values only: **`8, 16, 20, 28, 9999`** — `tokens.radii`.

| Element                              | Radius                 |
| ------------------------------------ | ---------------------- |
| Inputs, buttons, keypad keys         | 16 (`md`)              |
| Cards, list containers               | 20 (`lg`)              |
| Bottom navigation, sheets            | 28 (`xl`)              |
| Pills, chips, icon buttons, segments | 9999 (`pill`)          |

Visually equivalent components must share a radius. If two things look like the
same kind of object, they are the same radius.

## 6. Elevation

`tokens.elevation.{card,sheet,toast,tabBar}`. On a dark ground a shadow is
nearly invisible, so `card` paints nothing — cards are separated by surface
color, a hairline, and whitespace. Shadows survive only on floating chrome
(bottom navigation, toast, sheet) where content scrolls underneath. Never add a
shadow inline, and not every section needs a card.

## 7. Touch targets

Minimum 44×44. Icon buttons are 48×48. Buttons: `md` = 48 tall, `lg` = 56.
Rows are at least 56 tall, 60 when they carry a label plus a value.

A disabled button keeps a visible surface and mutes only its label — it must
never fade into the background.

## 7b. Motion

`tokens.motion`: `fast` 150ms, `base` 200ms, `slow` 250ms. Animation
communicates an interaction; it does not decorate. No looping, pulsing, or
bouncing, and no permanent glow.

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
| `Card`                                             | Rounded surface container, `card` / `surface` / `soft` variants   |
| `Button`                                           | `primary` `secondary` `outline` `ghost` `danger`, sizes `md` `lg` |
| `AppText`                                          | The only text primitive — `variant`, `tone`, `weight`             |
| `FormField`                                        | **The** text field — label, hint, error, multiline, count, pill   |
| `Input`                                            | Thin compat wrapper over `FormField`; prefer `FormField`          |
| `TypeToggle`                                       | Expense/Income switch, colored by `amountColor`                   |
| `SegmentedControl`                                 | Equal-width segments with a sliding, color-crossfading indicator  |
| `FilterChip`                                       | **The** chip — filters, categories, ranges. No screen-local chips |
| `TransactionRow`                                   | The transaction list row                                          |
| `MoneyAmount`                                      | **Every** money figure: sign, semantic color, tabular figures     |
| `StatBlock`                                        | Borderless label + figure, for stats sitting side by side         |
| `SettingsRow`                                      | Settings row: name, value, chevron or lock, tinted icon key       |
| `BottomNavigation`                                 | The one tab bar. Screens never render their own                   |
| `TrendAreaChart` / `TrendChart`                    | Home's weekly line; Insights' period bars                         |
| `BreakdownRow`                                     | A category's share as a horizontal comparison bar                 |
| `SuccessCheck`                                     | The success mark — one settling animation, never a loop           |
| `CategoryIcon`                                     | Tinted circular icon tile                                         |
| `ActionRow` / `SelectRow`                          | Settings and detail rows                                          |
| `NumericKeypad`                                    | Full-width keypad, filled keys, no outlines                       |
| `OdometerAmount`                                   | Animated money display                                            |
| `HapticPressable`                                  | The only pressable — never bare `Pressable`                       |
| `EmptyState` `Skeleton` `UndoToast` `RingProgress` | States and feedback                                               |

Icons are **Ionicons only**, at one size per context: 22 navigation, 20 rows and
buttons, 16–18 inline. Do not mix icon families.

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

### Tab bar

`BottomNavigation` shows five slots: **Home · Activity · Add · Insights ·
Profile**. `add` is not a route — it opens `/modals/add-transaction`.

`(tabs)/categories` is a registered route that the bar deliberately does not
show: six items left no room for the center action. It is reached from
**Profile → Categories & budgets**, and carries its own back control. If a tab
is ever added or removed, edit `VISIBLE_TABS` in `BottomNavigation.tsx` and give
any hidden route a way in — never leave a screen unreachable.

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
| `splash-icon.png`              | 1024² | Carries its own rounded tile (splash ground is `#0B0D0F`) |
| `favicon.png`                  | 48²   | Web                                                        |

Expo generates the per-density Android buckets and the full iOS icon set from
these sources at build time. To change the mark, edit the shape functions in
`scripts/generate-icons.js` and re-run — never edit a PNG by hand.

---

## 12. Review checklist

- [ ] No local `COLORS` / `SPACING` / `RADIUS` map
- [ ] No `"Inter_*"` string outside `tokens.ts` and `_layout.tsx`
- [ ] Money color via `amountColor` / `balanceColor`, rendered by `MoneyAmount`
- [ ] Gutter from `useScreenPaddingX()`, tab clearance from `useTabBarClearance()`
- [ ] No screen-local chip, field, row, stat or tab bar — use the shared one
- [ ] Radius on the allowed scale, and equal for visually equivalent components
- [ ] Ripple from `colors.ripple` / `colors.rippleOnAccent`
- [ ] `withAlpha()` for any color fed to SVG or `interpolateColor`
- [ ] Loading / empty / error / success all present on data-backed surfaces
- [ ] Touch targets ≥ 44, disabled buttons still visible
- [ ] Currency via `useBookCurrency`
- [ ] Spacing and radius from the allowed sets
- [ ] Repeated patterns use a shared component
- [ ] Loading / Error / Empty / Success all present
- [ ] Text fields do not navigate
- [ ] `npx tsc --noEmit` passes

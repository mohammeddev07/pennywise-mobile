# UI_CONTRACT.md

## Purpose
Lock the PennyWise light design system so screens, modals, and reusable components feel like one modern product.

## Rules
- Screens must use shared tokens and components for color, spacing, typography, radius, buttons, cards, inputs, rows, and tab navigation.
- Prefer extending shared primitives over adding screen-local copies of chips, rows, stat cards, icon buttons, or segmented controls.
- Inline styles are allowed for layout math and dynamic values only; static color, radius, spacing, and typography should come from tokens.
- Data-backed UI must preserve Loading, Error, Empty, and Success states.

## Tokens

### Spacing
Allowed spacing values: `0, 4, 8, 12, 16, 20, 24, 32, 40`.

Defaults:
- Screen horizontal padding: `24`
- Standard card padding: `16`
- Dense row vertical padding: `12`
- Section gap: `24`
- Bottom tab clearance: safe area + `120`

### Radius
Allowed radii: `8, 16, 24, 32, 9999`.

Assignments:
- Inputs/buttons: `16`
- Cards: `24`
- Sheets/full-screen modals: `32` top radius when modal, otherwise full light screen
- Pills/chips/icon buttons: `9999`
- Small icon tiles: `16` or `9999` depending on context

### Typography
Font family: Inter.

Required variants:
- `xs`: `12 / 16`, weight `500`
- `sm`: `14 / 20`, weight `500`
- `base`: `16 / 22`, weight `400`
- `lg`: `18 / 24`, weight `600`
- `xl`: `20 / 28`, weight `600`
- `2xl`: `28 / 34`, weight `700`
- `3xl`: `40 / 46`, weight `700`
- `amount`: `48 / 54`, weight `700`, money displays only

### Light Color System
Core:
- `app`: `#F8FAFC`
- `surface`: `#FFFFFF`
- `card`: `#FFFFFF`
- `surfaceAlt`: `#F3F7F4`
- `stroke`: `#E6EAF0`
- `text`: `#0B1220`
- `muted`: `#7A8596`
- `accent`: `#00C313`
- `accentPressed`: `#00A80F`
- `danger`: `#FF4D57`
- `warning`: `#F59E0B`
- `success`: `#00C313`

Tint tokens:
- `greenSoft`: `#EAFBEA`
- `redSoft`: `#FFE9EA`
- `amberSoft`: `#FFF4DD`
- `blueSoft`: `#EEF5FF`
- `purpleSoft`: `#F2EEFF`
- `neutralSoft`: `#F2F4F7`

Semantic aliases:
- `bg` = app
- `surface` = surface
- `surfaceAlt` = surfaceAlt
- `text` = text
- `textMuted` = muted
- `border` = stroke
- `primary` = accent
- `primaryPressed` = accentPressed
- `primarySoft` = greenSoft

### Elevation
- Cards may use the shared soft card elevation.
- Bottom tab bar and floating action buttons use the shared tab/floating elevation.
- Avoid heavy shadows and dark glass effects in the light theme.

## Component Inventory
- `Screen` - safe-area aware light screen shell with consistent padding and bottom-tab clearance
- `ScreenHeader` - title/subtitle/right-action header
- `HapticPressable` - unified haptic and press feedback
- `IconButton` - circular bordered icon action
- `Button` - primary, secondary, ghost, danger, and outline actions
- `AppText` - tokenized typography and tones
- `Card` - white rounded container with border and optional soft elevation
- `Input` - label/error text input plus search/pill variants
- `Sheet` - light modal/full-screen container with header/footer slots
- `SegmentedControl` - pill segmented filters
- `CategoryIcon` - tinted category/account/status icon
- `ActionRow` - reusable settings/detail/form row
- `SummaryStat` / `MetricCard` - reusable metric blocks
- `TransactionRow` - unified transaction list row
- `NumericKeypad` - light circular keypad
- `PinDots` - square PIN cells for auth
- `EmptyState`, `Skeleton`, `RingProgress`, `UndoToast`

## Acceptance Criteria
- The app renders with a light background and dark status bar icons.
- Cards, rows, inputs, and tab bar use white surfaces, light borders, green accents, and soft shadows consistently.
- Repeated UI patterns use shared components instead of screen-local copies.
- Transaction, budget, category, profile, analytics, auth, onboarding, and modal flows keep existing state behavior.
- `tsc --noEmit` passes.

# UI_CONTRACT.md

## Purpose
Lock a single design system contract (tokens + reusable components) so UI work is deterministic, reviewable, and consistent.

**Rules**
- Screens must not invent new spacing, typography, radii, or colors outside this contract.
- No new screens during Contract Phase; only components + tokens.
- Handle UI states everywhere: Loading / Success / Error / Empty.

---

## Tokens

### 1) Spacing scale (px) — allowed values only
`0, 4, 8, 12, 16, 20, 24, 32, 40`

**Defaults**
- Screen horizontal padding: **24**
- Standard card padding: **16**
- Dense list row vertical padding: **12**
- Section gap between blocks: **24**

---

### 2) Radius (px) — allowed values only
`8, 16, 24, 32, 9999`

**Assignments**
- Inputs: **16**
- Cards: **24**
- Sheets/Modals: **32** (top corners)
- Pills/Chips: **9999**
- Icon buttons: **9999** (circular)

---

### 3) Typography tokens (Inter)
Font family: **Inter**

Required tokens:
- `text-xs`: **12 / 16**, weight **500**
- `text-sm`: **14 / 20**, weight **500**
- `text-base`: **16 / 22**, weight **400**
- `text-lg`: **18 / 24**, weight **600**
- `text-xl`: **20 / 28**, weight **600**
- `text-2xl`: **28 / 34**, weight **700**

Money-only:
- `text-amount`: **48 / 52**, weight **700** (money displays only)

---

### 4) Color palette + semantic tokens (dark-first)

Palette:
- `black`: `#000000` (text/icon utility only; never a screen background)
- `app`: `#0B0F14`
- `surface`: `#10151D`
- `card`: `#141A23`
- `stroke`: `#1C2430`
- `text`: `#E7EEF8`
- `muted`: `#93A4B7`
- `accent`: `#22C55E`
- `accentPressed`: `#16A34A`
- `danger`: `#FF4D4D`
- `warning`: `#F59E0B`
- `success`: `#22C55E` (alias of accent)

Semantic:
- `bg` = app
- `surface` = surface
- `surfaceAlt` = card
- `text` = text
- `textMuted` = muted
- `border` = stroke
- `primary` = accent
- `primaryPressed` = accentPressed
- `danger` = danger
- `warning` = warning
- `success` = success
- `ink` = app (legacy alias; never use pure black as a screen background)

Contrast guidance (WCAG-aware):
- Normal text must be **≥ 4.5:1**
- Large text must be **≥ 3:1**
- `muted` is never used for primary actions or required values.

---

### 5) Elevation / shadows
Default: **no shadows** on cards/inputs (use border for separation).

Only allowed:
- `elevation-sheet`: modal sheets only
- `elevation-toast`: floating toast only

Reference values:
- iOS: shadowOpacity **0.35**, shadowRadius **24**, shadowOffset **0,10**
- Android: elevation **8**

---

### 6) Layout rules
- Screen padding X: **24**
- Top padding: safe-area + **12**
- Bottom padding: safe-area + **16** (or + **24** if bottom CTA)

Touch targets:
- Minimum interactive target: **44x44**
- Icon-only buttons: **48x48** preferred

---

## Component inventory

- `HapticPressable` — unified press feedback (haptic + scale/opacity)
- `Button` — primary/ghost/danger with fixed sizing + states
- `AppText` — typography token enforcement
- `Card` — padded surface container
- `Sheet` — safe-area padding + header/footer slots + top radius
- `Input` — label/help/error + fixed height/radius
- `AmountInput` — money display + keypad helper utilities
- `NumericKeypad` — shared numeric keypad for PIN and amount entry
- `SelectRow` — tappable label/value row + chevron
- `EmptyState` — empty visuals + optional CTA
- `Skeleton` — loading blocks (radius restricted)
- `StreamingText` — streaming text with reserved height (no jumping)
- `CharacterWidget` — mascot slot (happy/thinking/waiting) — no layout shift

---

## State patterns (required)
Every data-backed UI unit must implement:
- Loading: skeleton placeholders
- Streaming: stable layout (`StreamingText` w/ reserved height)
- Error: message + retry when actionable
- Empty: `EmptyState` with optional CTA
- Success: confirmation screen and short completion transitions are allowed when they preserve layout stability

---

## Acceptance criteria (measurable)

### HapticPressable — Done when
- Disabled: no haptic, no scale, opacity locked at **0.40**
- Press: scale to **0.98** within **80ms**, release within **120ms**
- Min target **44x44** where applicable

### Button — Done when
- Height: **48 (md)**, **56 (lg)**
- Padding X: **16**
- Radius: **16**
- Primary bg = `primary`, pressed bg = `primaryPressed`
- Disabled opacity = **0.40**
- Loading does not change width

### Input — Done when
- Height: **56**
- Padding X: **16**
- Radius: **16**
- Label uses `text-sm` muted
- Error uses `danger` and does not reflow the input

### SelectRow — Done when
- Height: **56**
- Chevron target: **48x48**
- Disabled opacity = **0.40**

### NumericKeypad — Done when
- Props: `onPress(key: string)`, `onDelete()`, `disabled?: boolean`, `decimalAllowed?: boolean`
- Layout: **3 columns**, **16** vertical gap, **24** horizontal gap
- Key touch area: **72x72**
- Visual circle: **64x64**, radius **9999**
- Key bg: `surface`; key border: **1px** `stroke`
- Key text: `text-2xl` for digits, `text-lg` for symbols, color `text`
- Pressed: visual bg switches to `card`, scale to **0.96** within **80ms**
- Disabled: opacity **0.40**, no haptic, no scale
- Backspace: subtle `backspace` icon, muted color
- Decimal: same sizing; muted/disabled when the context does not allow decimals

### Card — Done when
- Radius: **24**
- Padding: **16** default
- Border: `border`, no shadows

### Skeleton — Done when
- Radius restricted to **8/16/24** only
- Simple shimmer OK; no heavy animation

### StreamingText — Done when
- Reserved height prevents layout jump while streaming
- Can be disabled (renders full text)

---

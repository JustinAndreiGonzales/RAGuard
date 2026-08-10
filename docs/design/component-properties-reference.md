# Component Properties Reference

Quick-lookup companion to `rag-chatbot-design-spec.md` — that file has rationale and full page layouts; this file is just prop tables for building each component. One glance per component, no prose.

Token names below refer to the tokens defined in the design spec (§1). Use them directly as your CSS variable / Tailwind theme values.

---

## Token Vocabulary (for prop defaults)

**Spacing**: `2xs`=4 · `xs`=8 · `sm`=12 · `md`=16 · `lg`=24 · `xl`=32 · `2xl`=48 · `3xl`=64 · `4xl`=96
**Radius**: `none`=0 · `sm`=6 · `md`=10 · `lg`=14 · `xl`=20 · `full`=999
**Stroke**: `default`=1 · `thick`=2
**Elevation**: `sm` · `md` · `lg`
**Text styles**: `display` · `h1` · `h2` · `h3` · `body-lg` · `body` · `body-sm` · `caption` · `label` · `mono` · `mono-label`
**Color tokens**: `bg-canvas` `bg-surface` `bg-surface-raised` `overlay-scrim` `border-default` `border-subtle` `border-focus` `text-primary` `text-secondary` `text-tertiary` `text-on-accent` `accent-default` `accent-hover` `accent-pressed` `accent-subtle-bg` `danger-default` `danger-hover` `status-{pending|processing|ready|failed}-{bg|fg}`

---

## Button

| Prop | Type | Values | Default |
|---|---|---|---|
| `variant` | enum | `primary` \| `secondary` \| `ghost` \| `danger` | `primary` |
| `size` | enum | `sm` \| `md` \| `lg` | `md` |
| `state` | enum | `default` \| `hover` \| `pressed` \| `disabled` \| `loading` | `default` |
| `icon` | enum | `none` \| `leading` \| `trailing` | `none` |
| `fullWidth` | boolean | — | `false` |

| Size | Height | Padding-X | Text style |
|---|---|---|---|
| `sm` | 32 | `sm` (12) | `body-sm` |
| `md` | 40 | `md` (16) | `body` |
| `lg` | 48 | `lg` (24) | `body-lg` |

| Variant | Fill | Text | Border |
|---|---|---|---|
| `primary` | `accent-default` → `accent-hover` → `accent-pressed` | `text-on-accent` | none |
| `secondary` | `bg-surface` | `text-primary` | `border-default` |
| `ghost` | transparent → `bg-surface` on hover | `text-primary` | none |
| `danger` | `danger-default` → `danger-hover` | `text-on-accent` | none |

Radius `md`. Icon↔label gap `xs`. `disabled` = 40% opacity, pointer-events none. `loading` = spinner replaces label, width unchanged.

---

## Input / Textarea

| Prop | Type | Values | Default |
|---|---|---|---|
| `type` | enum | `input` \| `textarea` | `input` |
| `state` | enum | `default` \| `focus` \| `error` \| `disabled` | `default` |
| `label` | string | — | — |
| `helperText` | string \| null | — | `null` |
| `errorText` | string \| null | — | `null` |

| Field | Value |
|---|---|
| Height (input) | 40 |
| Min-height (textarea) | 96 |
| Padding | x `md` (16), y `sm` (12) |
| Radius | `md` |
| Border | `stroke-default` in `border-default` → `stroke-thick` in `border-focus` on focus |
| Text style | `body` (field), `label` (label), `caption` (helper/error) |
| Vertical gap (label→field→helper) | `2xs` (4) |

`error` state: border/helper text → `danger-default`. `disabled`: fill `bg-canvas`, text `text-tertiary`, border unchanged.

---

## Select

Same prop shape as Input (`state`, `label`, `helperText`), plus:

| Prop | Type | Values | Default |
|---|---|---|---|
| `options` | array | `{label, value}[]` | — |
| `placeholder` | string | — | — |

| Field | Value |
|---|---|
| Trigger sizing | same as Input |
| Trailing icon | chevron, `text-secondary` |
| Dropdown panel bg | `bg-surface-raised` |
| Dropdown elevation | `md` |
| Dropdown radius | `lg` |
| Option row padding-y | `sm` (12) |
| Option row hover bg | `accent-subtle-bg` |

---

## Status Badge

| Prop | Type | Values | Default |
|---|---|---|---|
| `status` | enum | `pending` \| `processing` \| `ready` \| `failed` | `pending` |

| Field | Value |
|---|---|
| Height | 24 |
| Padding-X | `xs` (8) |
| Radius | `full` |
| Dot↔label gap | `2xs` (4) |
| Text style | `mono-label` or `caption`, uppercase |

| `status` | bg token | fg token | Icon suggestion |
|---|---|---|---|
| `pending` | `status-pending-bg` | `status-pending-fg` | neutral dot |
| `processing` | `status-processing-bg` | `status-processing-fg` | spinner/pulse dot |
| `ready` | `status-ready-bg` | `status-ready-fg` | check |
| `failed` | `status-failed-bg` | `status-failed-fg` | x-mark |

---

## Avatar

| Prop | Type | Values | Default |
|---|---|---|---|
| `size` | enum | `sm` \| `md` \| `lg` | `md` |
| `src` | string \| null | image URL | `null` |
| `initials` | string | fallback when `src` is null | — |

| Size | Dimension |
|---|---|
| `sm` | 24 |
| `md` | 32 |
| `lg` | 40 |

Shape: circle (`radius-full`). Fallback fill `accent-subtle-bg`, fallback text `accent-default`.

---

## Nav Item

| Prop | Type | Values | Default |
|---|---|---|---|
| `active` | boolean | — | `false` |
| `icon` | node | 20px icon | — |
| `label` | string | — | — |

| Field | Value |
|---|---|
| Height | 40 |
| Width | full |
| Padding-X | `md` (16) |
| Radius | `md` (10) |
| Icon↔label gap | `sm` (12) |

| State | Bg | Icon/Label color | Extra |
|---|---|---|---|
| default | transparent | `text-secondary` | — |
| hover | `bg-canvas` | `text-secondary` | — |
| active (`active=true`) | `accent-subtle-bg` | `accent-default` | 2px accent bar, left edge |

---

## Table Row

| Prop | Type | Values | Default |
|---|---|---|---|
| `selected` | boolean | — | `false` |
| `cells` | node[] | — | — |

| Field | Value |
|---|---|
| Min height | 56 |
| Cell padding-X | `md` (16) |
| Border | `border-subtle`, bottom only, 1px |
| Vertical dividers | none |

| State | Bg | Extra |
|---|---|---|
| default | transparent | — |
| hover | `bg-canvas` | `elevation-sm` |
| `selected=true` | `accent-subtle-bg` | — |

---

## Modal Shell

| Prop | Type | Values | Default |
|---|---|---|---|
| `size` | enum | `sm` (400) \| `md` (560) \| `lg` (720) | `md` |
| `title` | string | — | — |
| `onClose` | function | — | — |

| Section | Padding | Notes |
|---|---|---|
| Header | `lg` (24) | `h2` title + close icon button, top-right |
| Divider | — | `border-subtle`, 1px, between header/body and body/footer |
| Body | `lg` (24) | scrollable if content overflows |
| Footer | `lg` (24) | right-aligned button row, gap `sm` (12) |

Container: radius `xl` (20), `elevation-lg`, bg `bg-surface-raised`. Backdrop: `overlay-scrim` @ 40% opacity, full viewport.

---

## Toast

| Prop | Type | Values | Default |
|---|---|---|---|
| `variant` | enum | `success` \| `error` \| `info` | `info` |
| `message` | string | — | — |
| `dismissible` | boolean | — | `true` |

| Field | Value |
|---|---|
| Width | 360 |
| Padding | `md` (16) |
| Radius | `lg` (14) |
| Elevation | `md` |
| Bg | `bg-surface-raised` |
| Text style | `body-sm` |

| `variant` | Icon color |
|---|---|
| `success` | sage (`status-ready-fg`) |
| `error` | rust (`status-failed-fg`) |
| `info` | neutral (`text-secondary`) |

---

## Empty State

| Prop | Type | Values | Default |
|---|---|---|---|
| `icon` | node | 48px icon, `text-tertiary` | — |
| `heading` | string | — | — |
| `body` | string | — | — |
| `ctaLabel` | string \| null | — | `null` |
| `onCtaClick` | function \| null | — | `null` |

| Field | Value |
|---|---|
| Layout | centered vertical stack |
| Gap | `sm` (12) |
| Max-width | 360 |
| Heading style | `h3` |
| Body style | `body`, `text-secondary` |
| CTA | Button, `primary` variant, only rendered if `ctaLabel` set |

---

## Citation Chip

| Prop | Type | Values | Default |
|---|---|---|---|
| `documentTitle` | string | truncated in chip | — |
| `excerpt` | string | shown in popover | — |
| `documentHref` | string | link target | — |
| `expanded` | boolean | controls popover visibility | `false` |

| Field | Value |
|---|---|
| Chip height | 22 |
| Chip padding-X | `xs` (8) |
| Chip radius | `full` |
| Chip bg / border | `bg-canvas` / `border-subtle` |
| Chip text style | `mono-label` |
| Popover bg | `bg-surface-raised` |
| Popover elevation | `md` |
| Popover radius | `lg` |
| Popover padding | `md` (16) |
| Popover max-width | 320 |
| Popover text style | `mono` |

---

## Modals (composed from Modal Shell — fields/state per modal, not variant props)

### Upload Modal
`size=md` (560)

| Field | Type | Notes |
|---|---|---|
| `dropzoneState` | enum: `empty` \| `file-selected` \| `uploading` \| `polling` \| `ready` \| `failed` | drives which body content renders |
| `file` | `{name, size, type}` \| `null` | — |
| `uploadProgress` | number (0–100) | shown only during `uploading` |
| `status` | Status Badge `status` prop | shown during `polling`/after |

Footer buttons: Cancel (`secondary`), Upload (`primary`, disabled unless `dropzoneState === 'file-selected'`).

### Share Modal
`size=md` (560)

| Field | Type | Notes |
|---|---|---|
| `principalType` | enum: `user` \| `team` | segmented toggle |
| `searchQuery` | string | — |
| `searchResults` | array | filtered by `principalType` |
| `grants` | `{principalType, name, avatarOrIcon}[]` | "People with access" list, each row has a Revoke ghost button |

Footer: Done (`primary`) only — no separate save step, actions apply immediately per row.

### Create Team Modal
`size=sm` (400)

| Field | Type | Notes |
|---|---|---|
| `teamName` | string | single Input |

Footer: Cancel (`secondary`), Create (`primary`).

### Add Member Modal
`size=sm` (400)

| Field | Type | Notes |
|---|---|---|
| `searchQuery` | string | search-by-email |
| `searchResults` | `{avatar, name, email}[]` | click row to add |
| `pendingMembers` | `{name}[]` | removable chip list of members staged this session |

Footer: Cancel (`secondary`), Add (`primary`).

### Confirm Delete Dialog
`size=sm` (400) — shared for document delete & team-member removal

| Field | Type | Notes |
|---|---|---|
| `itemLabel` | string | interpolated into heading: "Delete {itemLabel}?" |
| `consequenceText` | string | body copy, `text-secondary` |

Footer: Cancel (`secondary`), Delete (`danger`, primary-weight).

---

## Quick Index

| Component | Has variants? | Has states? | Has size prop? |
|---|---|---|---|
| Button | ✅ (4) | ✅ (5) | ✅ (3) |
| Input/Textarea | — | ✅ (4) | — |
| Select | — | ✅ (4, shared w/ Input) | — |
| Status Badge | ✅ (4, = status) | — | — |
| Avatar | — | — | ✅ (3) |
| Nav Item | — | ✅ (3: default/hover/active) | — |
| Table Row | — | ✅ (3: default/hover/selected) | — |
| Modal Shell | — | — | ✅ (3) |
| Toast | ✅ (3) | — | — |
| Empty State | — | — | — |
| Citation Chip | — | ✅ (2: collapsed/expanded) | — |

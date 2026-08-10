# RAG Chatbot — Design Specification

A permission-aware RAG (Retrieval-Augmented Generation) chatbot. Users upload documents that get chunked/embedded; a chatbot answers questions using only documents the querying user is permitted to see (owned, shared directly, or shared via a team).

This spec defines everything needed to design the full application: foundations (tokens), reusable components, every modal, and every page, with concrete sizing/padding/margin values so no layout decision is left ambiguous.

**Target**: desktop web app, 1440px primary canvas width, responsive not required for v1.
**Typeface**: Geist Sans (UI text), Geist Mono (code/citation/technical text).

---

## 0. Visual Direction

- **Vibe: warm & approachable** — not enterprise-dashboard-cold. Rounded-but-restrained corners, soft warm-tinted shadows (never pure black), friendly microcopy in empty states.
- **Explicitly avoid the "generic AI product" look**: no purple/indigo-to-blue gradients, no glowing sparkle/orb icons or motifs, no glassmorphism, no stock "AI assistant" bot avatars/mascots. The accent is a warm terracotta/clay tone, not violet.
- **Light and Dark are both first-class** — every screen and component must be specified for both, not light-primary-with-a-dark-afterthought.
- **Density: spacious.** Generous padding, comfortable line-height, clarity over cramming — this applies even to data-heavy views like the Documents table.

---

## 1. Foundations

### 1.1 Color Primitives (raw palette — not used directly in UI, only aliased by semantic tokens below)

| Scale | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **stone** (neutral) | #FBF9F6 | #F5EFE7 | #E8DFD1 | #D6C6AF | #B9A488 | #96805F | #78624A | #5C4A38 | #40342A | #2A2119 | #1C1611 |
| **clay** (accent) | #FDF1EA | #FBE0D0 | #F5C2A3 | #ED9E71 | #E17F4C | #C1602B | #A14E22 | #7E3D1B | #5E2E15 | #422010 | — |
| **sage** (success/ready) | #F1F5EC | — | #D3E0C1 | #B7CBA0 | — | #7C9A5E | — | #52693C | — | #253619 | — |
| **amber** (processing) | #FDF3E3 | — | #F0DBA8 | #E8C57E | — | #C6932A | — | #966D1B | — | #4A3512 | — |
| **rust** (danger/failed) | #FBEDEA | — | #EFC1B5 | #E29E8C | — | #B23A2E | — | #832A21 | — | #451D17 | — |

Also: `white` = #FFFFFF, `black` (warm ink) = #1C1611.

### 1.2 Semantic Color Tokens (Light / Dark)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `color/bg/canvas` | stone/50 `#FBF9F6` | stone/950 `#1C1611` | Page background |
| `color/bg/surface` | white `#FFFFFF` | stone/900 `#2A2119` | Cards, sidebar, table rows |
| `color/bg/surface-raised` | white `#FFFFFF` | stone/800 `#40342A` | Modals, popovers, dropdowns |
| `color/overlay/scrim` | stone/950 `#1C1611` (used at ~40% opacity) | stone/950 `#1C1611` (~40% opacity) | Modal backdrop |
| `color/border/default` | stone/200 `#E8DFD1` | stone/700 `#5C4A38` | Card/input/table borders |
| `color/border/subtle` | stone/100 `#F5EFE7` | stone/800 `#40342A` | Dividers |
| `color/border/focus` | clay/500 `#C1602B` | clay/400 `#E17F4C` | Focus ring on inputs |
| `color/text/primary` | stone/900 `#2A2119` | stone/50 `#FBF9F6` | Headings, body text |
| `color/text/secondary` | stone/600 `#78624A` | stone/300 `#D6C6AF` | Supporting text, labels |
| `color/text/tertiary` | stone/400 `#B9A488` | stone/500 `#96805F` | Placeholder, disabled text |
| `color/text/on-accent` | white `#FFFFFF` | white `#FFFFFF` | Text/icons on accent-filled surfaces |
| `color/accent/default` | clay/500 `#C1602B` | clay/400 `#E17F4C` | Primary buttons, links, active nav, selection |
| `color/accent/hover` | clay/600 `#A14E22` | clay/300 `#ED9E71` | Hover state of accent elements |
| `color/accent/pressed` | clay/700 `#7E3D1B` | clay/500 `#C1602B` | Pressed state |
| `color/accent/subtle-bg` | clay/50 `#FDF1EA` | clay/900 `#422010` | Active nav item bg, selected row bg |
| `color/danger/default` | rust/500 `#B23A2E` | rust/300 `#E29E8C` | Delete buttons, destructive text |
| `color/danger/hover` | rust/700 `#832A21` | rust/200 `#EFC1B5` | Hover on destructive elements |
| `color/status/pending/bg` \| `/fg` | stone/100 `#F5EFE7` \| stone/600 `#78624A` | stone/800 `#40342A` \| stone/300 `#D6C6AF` | Status badge — pending |
| `color/status/processing/bg` \| `/fg` | amber/50 `#FDF3E3` \| amber/700 `#966D1B` | amber/900 `#4A3512` \| amber/300 `#E8C57E` | Status badge — processing |
| `color/status/ready/bg` \| `/fg` | sage/50 `#F1F5EC` \| sage/700 `#52693C` | sage/900 `#253619` \| sage/300 `#B7CBA0` | Status badge — ready |
| `color/status/failed/bg` \| `/fg` | rust/50 `#FBEDEA` \| rust/500 `#B23A2E` | rust/900 `#451D17` \| rust/300 `#E29E8C` | Status badge — failed |

### 1.3 Typography

| Style | Font | Size / Line-height | Letter-spacing | Usage |
|---|---|---|---|---|
| Display | Geist SemiBold | 36 / 44 | -0.4 | Rare — big empty-state moments only |
| Heading/H1 | Geist SemiBold | 28 / 36 | -0.2 | Page titles |
| Heading/H2 | Geist SemiBold | 22 / 30 | -0.1 | Section headers, modal titles |
| Heading/H3 | Geist Medium | 18 / 26 | 0 | Card titles, subsections |
| Body/Large | Geist Regular | 16 / 24 | 0 | Chat message text |
| Body/Default | Geist Regular | 14 / 22 | 0 | Default UI text |
| Body/Small | Geist Regular | 13 / 20 | 0 | Secondary/dense text |
| Caption | Geist Regular | 12 / 16 | +0.1 | Timestamps, metadata |
| Label | Geist Medium | 13 / 18 | 0 | Form labels, button text |
| Mono/Default | Geist Mono Regular | 13 / 20 | 0 | Citation excerpts, technical values |
| Mono/Label | Geist Mono Medium | 11 / 16 | +0.2 | Small tags (file type, IDs) |

### 1.4 Spacing Scale

`2xs=4` · `xs=8` · `sm=12` · `md=16` · `lg=24` · `xl=32` · `2xl=48` · `3xl=64` · `4xl=96` (all px)

Default component internal padding = `md` (16px). Default gap between related fields = `sm` (12px). Default gap between unrelated sections = `xl` (32px) or `2xl` (48px).

### 1.5 Radius Scale

`none=0` · `sm=6` (small controls: checkboxes, tags) · `md=10` (buttons, inputs, table rows) · `lg=14` (cards, dropdowns) · `xl=20` (modals) · `full=999` (avatars, pills, badges)

### 1.6 Stroke Widths

`default=1px` (standard borders) · `thick=2px` (focus rings, active tab indicator)

### 1.7 Elevation (shadows — always warm-tinted using stone/950, never pure black)

| Style | Spec | Usage |
|---|---|---|
| Elevation/sm | `0 1px 3px rgba(28,22,17,0.06), 0 1px 2px rgba(28,22,17,0.05)` | Cards, table rows on hover |
| Elevation/md | `0 4px 10px rgba(28,22,17,0.08), 0 2px 6px rgba(28,22,17,0.06)` | Dropdowns, popovers, toasts |
| Elevation/lg | `0 12px 24px rgba(28,22,17,0.12), 0 4px 10px rgba(28,22,17,0.08)` | Modals |

---

## 2. Reusable Components

For every component below: build both Light and Dark, bind fills/text/borders to the semantic tokens above (never hardcode a hex value in a component).

### 2.1 Button
- **Variants**: Primary (accent fill, `text/on-accent` label), Secondary (surface fill + `border/default` outline, `text/primary` label), Ghost (transparent, `text/primary` label, `bg/surface` on hover), Danger (`danger/default` fill or outline, for delete actions)
- **Sizes**: sm (height 32, padding-x `sm`=12, `Body/Small`), md (height 40, padding-x `md`=16, `Body/Default`), lg (height 48, padding-x `lg`=24, `Body/Large`)
- **States**: default, hover (`accent/hover`/`danger/hover`), pressed (`accent/pressed`), disabled (40% opacity, no pointer), loading (spinner replaces label, button stays same width)
- Corner radius: `radius/md`. Icon slot optional, leading or trailing, gap `xs`=8 from label.

### 2.2 Input / Textarea
- Height 40 (input), min-height 96 (textarea). Padding-x `md`=16, padding-y `sm`=12.
- Border `stroke/default` in `color/border/default`; on focus, border becomes `border/focus` at `stroke/thick`=2px, no glow/shadow.
- Structure (vertical stack, gap `2xs`=4): Label (`Label` style) → Input field → Helper/Error text (`Caption`, `text/secondary` normally / `danger/default` on error).
- Disabled: `bg/canvas` fill, `text/tertiary` text, no border change.
- Corner radius: `radius/md`.

### 2.3 Select
- Same sizing/states as Input. Trailing chevron icon, `text/secondary`. Dropdown panel: `bg/surface-raised`, `Elevation/md`, `radius/lg`, options list with `sm`=12 vertical padding per row, hover row = `accent/subtle-bg`.

### 2.4 Status Badge
- Pill shape, `radius/full`, height 24, padding-x `xs`=8, gap `2xs`=4 between dot and label.
- 4 states, each using its `bg`/`fg` token pair from §1.2: **Pending** (neutral dot), **Processing** (amber dot, subtle pulse/spin animation note for dev), **Ready** (sage dot/checkmark), **Failed** (rust dot/x-mark).
- Text style: `Mono/Label` or `Caption`, uppercase.

### 2.5 Avatar
- Sizes: sm=24, md=32, lg=40. Circle (`radius/full`). Fallback = initials on `accent/subtle-bg` fill with `accent/default` text if no image.

### 2.6 Nav Item (sidebar)
- Height 40, full-width, padding-x `md`=16, radius `md`=10, icon (20px) + label (`Label` style) with gap `sm`=12.
- Default: transparent bg, `text/secondary` icon+label. Hover: `bg/canvas` (subtle). Active: `accent/subtle-bg` fill, `accent/default` icon+label+left 2px accent bar.

### 2.7 Table Row
- Height 56 min (grows with content), padding-x `md`=16 per cell, border-bottom `border/subtle` 1px, no vertical dividers between cells.
- Hover: `bg/canvas` fill + `Elevation/sm`. Selected: `accent/subtle-bg`.

### 2.8 Modal Shell
- Width: sm=400, md=560, lg=720 (pick per modal below). Corner radius `radius/xl`=20, `Elevation/lg`, `bg/surface-raised`.
- Structure (vertical): Header (padding `lg`=24, `Heading/H2` title + close icon button top-right) → Divider (`border/subtle` 1px) → Body (padding `lg`=24, scrollable if tall) → Divider → Footer (padding `lg`=24, right-aligned button row, gap `sm`=12 between buttons).
- Backdrop: full-viewport `overlay/scrim` at 40% opacity.

### 2.9 Toast
- Width 360, padding `md`=16, radius `lg`=14, `Elevation/md`, `bg/surface-raised`.
- Leading icon (status-colored) + message (`Body/Small`) + optional trailing dismiss icon. Variants: success (sage), error (rust), info (stone/neutral).

### 2.10 Empty State
- Centered vertical stack, gap `sm`=12, max-width 360, used inside any list/panel that has zero items.
- Structure: icon (48px, `text/tertiary`) → Heading (`Heading/H3`) → Body text (`Body/Default`, `text/secondary`) → optional primary Button CTA.

### 2.11 Citation Chip
- Inline pill, height 22, padding-x `xs`=8, radius `full`, `bg/canvas` fill, `border/subtle` outline, `Mono/Label` text showing doc title (truncated).
- On hover/click: expands to a popover (`bg/surface-raised`, `Elevation/md`, `radius/lg`, padding `md`=16, max-width 320) showing the source chunk excerpt in `Mono/Default` plus a "View document" link to the Document Detail page.

---

## 3. Modals

All modals use the Modal Shell (§2.8).

### 3.1 Upload Modal (width: md=560)
- Body: drag-and-drop zone (dashed `border/default`, radius `lg`, padding `2xl`=48, centered icon+text "Drag a file here or click to browse", accepted types/size note in `Caption`) → on file selected, replace with a file row (icon, filename, size, remove ✕) → progress bar during upload → after upload, an inline Status Badge that updates via polling (pending → processing → ready/failed) without closing the modal.
- Footer: Cancel (Secondary) + Upload (Primary, disabled until a valid file is chosen).

### 3.2 Share Modal (width: md=560)
- Body, top section: search input ("Add person or team by email/name") with a segmented toggle or tabs for **User** / **Team** target type, gap `md`=16 below to a result dropdown.
- Body, bottom section: "People with access" list — each row = Avatar/Team-icon + name + a small trailing "Revoke" ghost button; principal-type icon (person vs team) precedes the name.
- Footer: Done (Primary) only — grants/revokes apply immediately per row, no separate save step.

### 3.3 Create Team Modal (width: sm=400)
- Body: single Input for team name.
- Footer: Cancel (Secondary) + Create (Primary).

### 3.4 Add Member Modal (width: sm=400)
- Body: search-by-email Input with live-filtered results list below (Avatar + name + email, click to add), and a running list of members already added this session shown as removable chips.
- Footer: Cancel (Secondary) + Add (Primary).

### 3.5 Confirm Delete Dialog (width: sm=400, shared pattern for document delete / team-member removal)
- Body: Warning icon (rust) + `Heading/H3` ("Delete [item]?") + `Body/Default` explanation of consequence, `text/secondary`.
- Footer: Cancel (Secondary) + Delete (Danger, Primary-weight).

---

## 4. Pages

Global frame: 1440 width. **App shell** (applies to every authenticated page): fixed-width left sidebar (260px, `bg/surface`, `border/default` right edge, padding `md`=16) containing nav items (§2.6: Chat, Documents, Teams [admin-role only]) at top, user menu (avatar + name/email + role badge, opens to Account link + Sign out) pinned to bottom. Main content area fills remaining width, padding `2xl`=48, `bg/canvas` background.

### 4.1 Login (unauthenticated, no app shell)
- Centered card (width 400) on `bg/canvas` full-viewport. Card: `bg/surface`, `radius/xl`, `Elevation/md`, padding `2xl`=48.
- Contents (vertical, gap `md`=16): logo/wordmark → `Heading/H2` "Log in" → email Input → password Input → error banner (rust, only if present) → Primary Button "Log in" (full width) → `Caption` link row "Don't have an account? Sign up" pointing to Signup.

### 4.2 Signup (unauthenticated, no app shell)
- Same shell as Login. Fields: name, email, password, confirm password. Primary Button "Create account". Link back to Login.

### 4.3 Chat (`/chat`, `/chat/[conversationId]`)
- Within app shell's content area, split into two panels:
  - **Conversation sub-panel** (width 280, `border/default` right edge, padding `md`=16): "New chat" Button (full width, Secondary) at top, then a scrollable list of past conversations grouped by date label (`Caption`, `text/tertiary`), each item = title (`Body/Small`, truncated) + relative timestamp, active conversation highlighted like an active Nav Item.
  - **Thread panel** (fills remaining width): scrollable message list, padding `xl`=32, gap `lg`=24 between messages. User message = right-aligned bubble (`accent/subtle-bg` fill, `radius/lg`, padding `md`=16, max-width 65%). Assistant message = left-aligned, no bubble (flush text, `Body/Large`), Citation Chips (§2.11) row below the answer text, gap `xs`=8 from text. Input bar pinned to bottom (padding `lg`=24, `bg/surface` top border), Textarea + Send button, disabled while streaming.
- **Empty states**: no conversations yet → Empty State pattern in the thread panel ("Ask something to get started"). Zero accessible documents → Empty State with CTA text "Ask an admin to share a document with you" (matches the existing fixed chat backend response), input bar disabled.

### 4.4 Documents List (`/documents`)
- Header row: `Heading/H1` "Documents" + Upload Button (Primary) right-aligned.
- Table (§2.7 rows): columns — Title (with file-type Mono/Label icon-tag), Status (Status Badge), Owner (Avatar+name), Shared via (icon: direct/team/— ), Uploaded (Caption, relative date), Actions (Share + Delete icon buttons, Ghost, owner/admin only).
- Empty state (new user, zero documents): Empty State pattern, CTA = Upload Button.

### 4.5 Document Detail (`/documents/[id]`)
- Two-column layout: left = metadata card (`bg/surface`, `radius/lg`, padding `lg`=24, gap `sm`=12 rows of label/value pairs: Owner, Type, Size, Status Badge, Uploaded date, Embedding model, Chunk count) with Share + Delete Buttons at the bottom of the card; right = optional chunk preview list (scrollable, each chunk = `Mono/Default` excerpt in a bordered card, `sm`=12 gap between).
- If `status: failed`: a full-width error banner above the columns (`status/failed/bg` fill, `status/failed/fg` text, padding `md`=16, radius `md`) showing `processingError`.

### 4.6 Teams List (`/admin/teams`, admin role only)
- Header: `Heading/H1` "Teams" + "Create team" Button (Primary).
- Table: columns — Team name, Member count, Actions (View).
- Empty state if no teams yet.

### 4.7 Team Detail (`/admin/teams/[id]`)
- Header: team name (`Heading/H1`) + "Add member" Button (Primary).
- Member table: Avatar+name, email, Actions (Remove, Ghost/danger icon button).

### 4.8 Account (`/account`)
- Single card (`bg/surface`, `radius/lg`, padding `2xl`=48, max-width 560, centered in content area).
- Sections (gap `xl`=32): Profile (Avatar lg, name, email, role Status-Badge-style tag) → Team memberships (read-only chip list) → Change password (current/new/confirm Inputs + Primary Button "Update password").

---

## 5. Component → Page Usage Matrix (for build sequencing)

| Component | Used in |
|---|---|
| Button | every page/modal |
| Input/Textarea | Login, Signup, Chat input, Upload, Share, Create Team, Add Member, Account |
| Select | Share modal (team picker) |
| Status Badge | Documents List, Document Detail, Upload modal, Account (role tag) |
| Avatar | App shell (user menu), Documents List (owner), Share/Add Member modals, Team Detail, Account |
| Nav Item | App shell sidebar |
| Table Row | Documents List, Teams List, Team Detail |
| Modal Shell | Upload, Share, Create Team, Add Member, Confirm Delete |
| Toast | any async action failure across the app |
| Empty State | Chat (no conversations / no documents), Documents List, Teams List |
| Citation Chip | Chat (assistant messages) |

---

## Notes for whoever designs from this spec

- This is a greenfield build — no existing Figma file conventions to match; use the naming scheme above verbatim (slash-hierarchy token names) so it round-trips cleanly to CSS variables/Tailwind config.
- Backend context (already built, drives what states must exist): document `status` is one of `pending|processing|ready|failed`; permission model shares documents to a `user` or a `team`; roles are `admin|user`; chat is currently stateless server-side (no persisted messages table yet) — the Chat History UI here is intentionally ahead of the backend, per the product plan.

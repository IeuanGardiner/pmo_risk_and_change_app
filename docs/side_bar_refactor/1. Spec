# Spec: Collapsible Sidebar — RiskShield

> Derived from: `docs/side_bar_refactor/0. Pre Spec/Pre Spec`
> Confirmed via: structured pre-implementation interview (June 2026)
> Status: Confirmed — ready for implementation
> Scope: `Sidebar.tsx`, `App.tsx` (minimal), `index.css`

---

## Objective

Redesign `Sidebar.tsx` into a **fixed-position floating island** with a **genuinely
translucent frosted-glass surface** that overlays the page. The sidebar collapses to a
comfortable icon rail (68px) with dark-glass hover tooltips. The main content area
animates its left margin to match the sidebar width via a CSS custom property, keeping
content fully readable in both states.

This is the **launch UI change** that establishes the visual direction for the rest of
the app's modernisation. Nothing else changes in this PR. The implementation must:

- Touch only three files: `Sidebar.tsx`, `App.tsx` (two lines), `index.css`.
- Add zero new npm dependencies.
- Remain fully compatible with the existing theme system (CSS custom properties,
  light/dark schemes, custom accent colour, branding config).
- Be readable by a future agent or developer unfamiliar with this session.

### User stories

- As a PMO user working long sessions I want the sidebar to collapse to a breathing,
  comfortable icon rail so I gain horizontal space without feeling cramped.
- As a PMO user I want the sidebar to feel genuinely premium — content visibly bleeding
  through the glass, smooth spring animation — so the app reads as a polished product.
- As a PMO user my collapsed/expanded preference is remembered across reloads.
- As a keyboard/screen-reader user I can toggle the sidebar without a pointer, and
  collapsed nav items expose their labels to assistive technologies.
- As a user with `prefers-reduced-motion` I get instant state transitions with no
  animation.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 18 + TypeScript 5.6 |
| Build | Vite 5 |
| Routing | react-router-dom v6 (NavLink) |
| Styling | Inline styles + CSS custom properties (no Tailwind, no CSS modules) |
| Animation | CSS `transition` on inline style props; `<style>` tag for `@media` rules |
| State | Local `useState` in `Sidebar.tsx`; CSS custom property on `<html>` for margin sync |

---

## Commands

```bash
npm run dev        # dev server at http://localhost:5173
npm run build      # tsc -b && vite build — must pass with 0 errors
npm run typecheck  # tsc -b --noEmit — fastest check
npm run preview    # serve the dist/ folder locally
```

---

## Project Structure

Exactly three files are modified. No new files. No new directories.

```
src/
  components/
    layout/
      Sidebar.tsx     MODIFY — full refactor per this spec
  App.tsx             MODIFY — two lines only (marginLeft + transition on main content div)
  index.css           MODIFY — add CSS custom properties for glass + sidebar-width token
```

---

## Visual Design

### Position & Layout Model

The sidebar is `position: fixed`, covering `top: 0`, `left: 0`, `bottom: 0`. It sits
**above** the page content — it does not push content in the DOM flow. The main content
area compensates with an animated `marginLeft` driven by a CSS custom property that
`Sidebar.tsx` writes to `document.documentElement` on every state change.

```
Viewport (100vw × 100vh):

  ┌──────────────────────────────────────────────────┐
  │  [island: fixed, overlays everything]            │
  │  ┌─────────┐                                     │
  │  │         │  main content (full width behind)   │
  │  │  Glass  │  gets marginLeft: var(--sidebar-w)  │
  │  │  Island │  so content is never obscured       │
  │  │         │                                     │
  │  └─────────┘                                     │
  └──────────────────────────────────────────────────┘
```

The CSS custom property approach keeps `Sidebar.tsx` as the single owner of collapsed
state — `App.tsx` requires no knowledge of the state, only the CSS variable.

### Sidebar width tokens

Two values, written to `--sidebar-w` on `<html>` by `Sidebar.tsx`:

| State | `--sidebar-w` | Island visible width |
|---|---|---|
| Expanded | `252px` | `220px` (252 − 16px margin each side) |
| Collapsed | `68px` | `36px` (68 − 16px margin each side) |

The 16px margin on all sides gives the island the breathing room needed for the
floating-above-the-page illusion.

```
Expanded:
  fixed div: width 252px
    └─ island: margin 16px, width calc(100% - 32px), border-radius 18px

Collapsed:
  fixed div: width 68px
    └─ island: margin 16px, width calc(100% - 32px), border-radius 18px
```

Both states use the same margin and radius — only the outer fixed width changes.

### App.tsx change (two lines only)

The `<div style={{ flex: 1, overflow: "hidden", ... }}>` in `Shell` gains:

```tsx
marginLeft: "var(--sidebar-w)",
transition: "margin-left 300ms cubic-bezier(0.16, 1, 0.3, 1)",
```

The `<Sidebar>` JSX node is removed from the flex row (it's now fixed) but the
component still mounts in the tree so it can call `useAppData`, `useAuth`, etc.
Sidebar is rendered as a sibling to the flex row, not inside it:

```tsx
// Before
<div style={{ display: "flex", height: "100vh" }}>
  <Sidebar searchRef={searchRef} />
  <div style={{ flex: 1, ... }}>...</div>
</div>

// After
<>
  <Sidebar searchRef={searchRef} />
  <div style={{ marginLeft: "var(--sidebar-w)", transition: "margin-left 300ms ...", ... }}>
    ...
  </div>
</>
```

---

## Frosted Glass Surface

The glass must be **genuinely translucent** — content scrolling behind the sidebar is
visible through it. This is the primary "wow factor" of the feature. The background
alpha is calibrated so a light-coloured page (risk register, form fields) clearly bleeds
through the blur.

### CSS values

```
backdrop-filter: blur(20px) saturate(180%)
-webkit-backdrop-filter: blur(20px) saturate(180%)
```

**Light mode** (applied via `--sidebar-glass-bg` in the `:root[data-theme="light"]`
block of `index.css`):

```css
--sidebar-glass-bg:     rgba(18, 20, 30, 0.55);
--sidebar-glass-border: rgba(255, 255, 255, 0.10);
--sidebar-glass-shadow: 0 8px 40px rgba(0, 0, 0, 0.22),
                        0 2px 10px rgba(0, 0, 0, 0.14),
                        inset 0 1px 0 rgba(255, 255, 255, 0.06);
```

**Dark mode** (`:root[data-theme="dark"]` block):

```css
--sidebar-glass-bg:     rgba(6, 7, 12, 0.65);
--sidebar-glass-border: rgba(255, 255, 255, 0.06);
--sidebar-glass-shadow: 0 8px 40px rgba(0, 0, 0, 0.45),
                        0 2px 10px rgba(0, 0, 0, 0.30),
                        inset 0 1px 0 rgba(255, 255, 255, 0.04);
```

The 0.55 / 0.65 alpha values are deliberately lower than the previous spec's 0.82 / 0.88
to achieve genuine translucency where app content is visible through the panel, not just
a semi-opaque overlay with a blur edge.

**Fallback:** Browsers without `backdrop-filter` support (`@supports not (backdrop-filter: blur(1px))`)
receive `--sidebar-glass-bg` at full opacity (`rgba(18, 20, 30, 1.0)` / `rgba(6, 7, 12, 1.0)`).
The layout is identical — only the glass effect is lost.

### Island structure (inline styles)

```tsx
<div
  className="rs-sidebar-island"
  style={{
    background:          "var(--sidebar-glass-bg)",
    backdropFilter:      "blur(20px) saturate(180%)",
    WebkitBackdropFilter:"blur(20px) saturate(180%)",
    border:              "1px solid var(--sidebar-glass-border)",
    boxShadow:           "var(--sidebar-glass-shadow)",
    borderRadius:        18,
    margin:              16,
    position:            "fixed",
    top:                 0,
    left:                0,
    bottom:              0,
    width:               isCollapsed ? "calc(68px - 32px)" : "calc(252px - 32px)",
    transition:          "width 300ms cubic-bezier(0.16, 1, 0.3, 1)",
    display:             "flex",
    flexDirection:       "column",
    overflowX:           "hidden",
    overflowY:           "auto",
    zIndex:              50,
  }}
>
```

> Note: `zIndex: 50` keeps the sidebar below modals (`zIndex: 1000`) and toasts
> (`zIndex: 1100`) — no z-index conflicts with existing overlays.

---

## Toggle Button

- **Position:** Top-right corner of the island, inside the branding row.
- **Icon:** `ChevronLeft` when expanded, `ChevronRight` when collapsed (lucide-react,
  already a dependency).
- **Size:** 28×28px, `borderRadius: 8`, `border: 1px solid var(--sidebar-glass-border)`,
  `background: rgba(255,255,255,0.06)`.
- **`aria-label`:** `"Collapse sidebar"` / `"Expand sidebar"`.
- **`aria-expanded`:** Boolean, reflects current state.
- **Focus ring:** `outline: 2px solid var(--brand)` on `:focus-visible` via `<style>` tag.

The existing dark-mode toggle (sun/moon) moves to directly below the logo in collapsed
state, and stays in the branding row in expanded state alongside the collapse button.

---

## Expand / Collapse State Machine

### What `Sidebar.tsx` does on toggle

```ts
const SIDEBAR_COLLAPSED_KEY = "riskshield.sidebar.collapsed";

const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
  try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"; }
  catch { return false; }
});

// Called on mount AND on every toggle — keeps CSS var in sync
const applySidebarWidth = (collapsed: boolean) => {
  document.documentElement.style.setProperty(
    "--sidebar-w",
    collapsed ? "68px" : "252px",
  );
};

// On mount: sync CSS var to stored preference without triggering transition
useEffect(() => { applySidebarWidth(isCollapsed); }, []); // eslint-disable-line

const handleToggleSidebar = () => {
  const next = !isCollapsed;
  setIsCollapsed(next);
  applySidebarWidth(next);
  try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0"); } catch { /**/ }
};
```

The `useEffect` on mount runs before the first paint and sets `--sidebar-w` without a
transition (the transition property on the main content div is always present, but since
this fires synchronously before layout the browser skips it). No flash of wrong state.

---

## Animation Specification

### Island width

Handled by the `width` CSS transition on the island div (see above): `300ms
cubic-bezier(0.16, 1, 0.3, 1)`. This easing decelerates rapidly then settles — a
subtle spring that reads as snappy and intentional, not bouncy.

### Nav item labels

```tsx
<span
  style={{
    opacity:    isCollapsed ? 0 : 1,
    maxWidth:   isCollapsed ? 0 : 140,
    overflow:   "hidden",
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: isCollapsed
      ? "opacity 100ms ease, max-width 250ms cubic-bezier(0.4, 0, 1, 1)"
      : "opacity 180ms ease 100ms, max-width 300ms cubic-bezier(0.16, 1, 0.3, 1)",
  }}
>
  {item.label}
</span>
```

The **100ms delay on expand** (`opacity 180ms ease 100ms`) lets the island width open
first, then the text fades in. On collapse the text fades immediately before the width
closes. This prevents the "text clips mid-animation" artefact.

### Section headers, portfolio stats, search, keyboard hints, user name

These elements all share the same pattern:

```tsx
style={{
  opacity:        isCollapsed ? 0 : 1,
  maxHeight:      isCollapsed ? 0 : 200,  // each element has an appropriate max
  overflow:       "hidden",
  pointerEvents:  isCollapsed ? "none" : "auto",
  transition:     isCollapsed
    ? "opacity 100ms ease, max-height 250ms ease"
    : "opacity 150ms ease 80ms, max-height 300ms cubic-bezier(0.16, 1, 0.3, 1)",
}}
```

### Reduced motion

A `<style>` tag in `Sidebar.tsx` (matching the existing `rs-kbd-hints` pattern):

```css
@media (prefers-reduced-motion: reduce) {
  .rs-sidebar-island,
  .rs-sidebar-island * {
    transition-duration: 0.01ms !important;
    animation-duration:  0.01ms !important;
  }
}
```

---

## Collapsed State — Content Rules

| Element | Collapsed behaviour |
|---|---|
| `BrandMark` icon | Visible, centred |
| App name + strapline text | Hidden (`opacity: 0`, `maxWidth: 0`) |
| Collapse toggle (chevron) | Visible, top-right of branding row |
| Dark-mode toggle (sun/moon) | Visible, icon only, centred below logo |
| Nav section labels ("Risk", "Change", etc.) | Hidden |
| Nav item icons | Visible, centred in island |
| Nav item label text | Hidden (see animation spec) |
| Global search bar | Hidden + `aria-hidden="true"`, `tabIndex={-1}` on input |
| Portfolio stats block | Hidden |
| Keyboard shortcuts hints | Hidden |
| User name + role text | Hidden |
| User avatar (initials circle) | Visible, centred |
| Sign-out button | Visible, icon only |

**Icon alignment in collapsed state:**

```tsx
style={{
  display:        "flex",
  alignItems:     "center",
  justifyContent: isCollapsed ? "center" : "flex-start",
  gap:            isCollapsed ? 0 : 11,
  padding:        isCollapsed ? "8px 0" : "8px 11px",
  transition:     "padding 200ms ease, gap 200ms ease",
}}
```

---

## Tooltip Behaviour (Collapsed State, Pointer-Fine Only)

When collapsed, hovering a nav item shows a **dark-glass tooltip** to the right of the
island — matching the sidebar's own visual language, not the app's light surface.

### Structure

```tsx
{isCollapsed && (
  <span className="rs-nav-tooltip" aria-hidden="true">
    {item.label}
  </span>
)}
```

The tooltip span is in the DOM only when collapsed. It is `aria-hidden` — screen readers
get the label from the visually-hidden (but DOM-present) label `<span>`.

### CSS (in the `<style>` tag inside `Sidebar.tsx`)

```css
@media (pointer: fine) {
  .rs-nav-item {
    position: relative;
  }

  .rs-nav-tooltip {
    position:       absolute;
    left:           calc(100% + 12px);
    top:            50%;
    transform:      translateY(-50%) translateX(-4px);
    background:     rgba(18, 20, 30, 0.82);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    border:         1px solid rgba(255, 255, 255, 0.10);
    box-shadow:     0 4px 16px rgba(0, 0, 0, 0.28);
    color:          #c9cdd9;
    border-radius:  8px;
    padding:        6px 12px;
    font-size:      12.5px;
    font-weight:    600;
    white-space:    nowrap;
    pointer-events: none;
    opacity:        0;
    transition:     opacity 120ms ease, transform 120ms ease;
    z-index:        51;
  }

  .rs-nav-item:hover .rs-nav-tooltip {
    opacity:   1;
    transform: translateY(-50%) translateX(0);
  }
}
```

The tooltip uses **hardcoded rgba values** matching the sidebar glass, not CSS variables
— because it must match the sidebar's dark glass regardless of the app's light/dark
scheme (the sidebar is always dark glass). The sidebar text colour `#c9cdd9` matches
`--sidebar-text`, which is scheme-invariant.

---

## Accessibility

| Requirement | Implementation |
|---|---|
| Toggle `aria-label` | `"Collapse sidebar"` / `"Expand sidebar"` |
| Toggle `aria-expanded` | `{!isCollapsed}` |
| Nav label readable by AT when collapsed | Label `<span>` stays in DOM; `aria-hidden` is NOT set |
| Search hidden from AT when collapsed | `aria-hidden="true"` + `tabIndex={-1}` on input |
| Focus ring on toggle button | `:focus-visible` outline via `<style>` tag |
| Tooltip hidden from AT | `aria-hidden="true"` on tooltip span |
| Nav keyboard traversal | Unchanged — NavLink handles focus natively |

---

## Code Style

```tsx
// ✅ Correct — CSS variable written to document root for margin sync
useEffect(() => {
  document.documentElement.style.setProperty("--sidebar-w", isCollapsed ? "68px" : "252px");
}, []); // on mount only — toggle handler calls applySidebarWidth directly

// ✅ Correct — spring easing on the island width, matching the main content transition
transition: "width 300ms cubic-bezier(0.16, 1, 0.3, 1)"

// ✅ Correct — delayed label fade-in so width opens before text appears
transition: isCollapsed
  ? "opacity 100ms ease, max-width 250ms ease"
  : "opacity 180ms ease 100ms, max-width 300ms cubic-bezier(0.16, 1, 0.3, 1)"

// ✅ Correct — tooltip uses hardcoded rgba to always match dark glass, not theme surface
background: "rgba(18, 20, 30, 0.82)"

// ❌ Wrong — do not use position: static or flex for sidebar (must be fixed)
// ❌ Wrong — do not use var(--surface) for tooltips (would be light in light mode)
// ❌ Wrong — do not add Framer Motion, react-spring, or any animation library
// ❌ Wrong — do not lift isCollapsed out of Sidebar.tsx (CSS var handles the sync)
// ❌ Wrong — do not use backdrop-filter without the -webkit- prefix
```

**Naming conventions:**
- State: `isCollapsed` (boolean)
- Toggle handler: `handleToggleSidebar`
- Width applicator: `applySidebarWidth(collapsed: boolean)`
- localStorage key: `SIDEBAR_COLLAPSED_KEY`
- CSS class on island: `rs-sidebar-island`
- CSS class on nav item wrapper: `rs-nav-item`
- CSS class on tooltip: `rs-nav-tooltip`
- CSS variable: `--sidebar-w` (written to `<html>`)

---

## Testing Strategy

No automated test suite. Manual verification + typecheck:

```bash
npm run typecheck   # must pass with 0 errors
npm run build       # must complete cleanly
```

### Manual verification checkpoints

1. **Cold load — expanded:** App boots, sidebar is expanded at 252px, content margin matches. No animation on load.
2. **Cold load — collapsed:** Set `riskshield.sidebar.collapsed = "1"` in DevTools, reload. Sidebar boots collapsed at 68px. No flash of expanded state.
3. **Toggle animation:** Collapse and expand. Width spring-animates, labels fade correctly (text visible after width, hidden before). Content margin follows.
4. **Glass translucency:** Scroll a risk register so rows are behind the sidebar. Rows must be visible through the glass panel.
5. **Tooltip:** In collapsed state, hover each nav icon. Dark-glass label appears to the right. Does NOT appear in expanded state.
6. **Tooltip — no-touch:** On a touch device or in DevTools touch mode, tooltips must not appear.
7. **Light mode glass:** Switch to light mode. Glass remains dark and translucent. App background (light grey) bleeds through.
8. **Dark mode glass:** Switch to dark mode. Glass is darker but still translucent. Content visible through it.
9. **Custom accent:** Change accent in Settings. Active nav highlight and toggle focus ring update correctly.
10. **Reduced motion:** Enable `prefers-reduced-motion: reduce` in DevTools. All transitions are instant. No animation occurs.
11. **All 6 demo roles:** Sign in as each demo account. Permission-gated nav items still hidden. Collapse/expand works for all roles.
12. **Modal z-index:** Open a risk form modal. It renders above the sidebar. No z-index conflict.
13. **Toast z-index:** Trigger a toast. It renders above the sidebar.
14. **Persistence:** Toggle, reload. State is restored. Toggle again, reload. State is restored in the other direction.
15. **Screenshot:** Attach expanded + collapsed in both light and dark mode (4 screenshots) to the PR.

---

## Boundaries

**Always:**
- `npm run typecheck` passes before considering any task done.
- `WebkitBackdropFilter` alongside `backdropFilter` — Safari requires the prefix.
- `zIndex: 50` on the sidebar island — below modals (1000) and toasts (1100).
- Nav items remain keyboard-navigable in both states.
- The island uses `overflowY: "auto"` so long nav lists don't clip on small viewports.

**Ask first:**
- Adding any npm dependency including animation libraries.
- Lifting `isCollapsed` state out of `Sidebar.tsx` into context or a store.
- Changing the `Shell` component structure in `App.tsx` beyond the two-line margin change.
- Adjusting the alpha values below 0.50 (genuine glass) or above 0.80 (effectively opaque).

**Never:**
- Use `var(--surface)` or any light-mode CSS variable for the tooltip — it must always
  match the dark glass sidebar regardless of scheme.
- Use `position: sticky`, `static`, or flex for the sidebar outer wrapper.
- Use `backdrop-filter` without the `-webkit-` vendor prefix.
- Use `!important` except in the `prefers-reduced-motion` rule.
- Remove the keyboard shortcuts or portfolio stats block from the DOM — hide them, do
  not delete them.
- Hardcode non-glass colours — use CSS custom properties or the `alpha()` helper.

---

## Implementation Plan

Three sequential tasks; each gates the next.

### Task 1 — Structure, Glass & State

**Description:** Add new CSS custom properties to `index.css`. Convert the sidebar from
a flex item to `position: fixed`. Build the island structure with frosted glass. Add
`--sidebar-w` CSS variable writes. Make the two-line `App.tsx` change. Add
`isCollapsed` state + `SIDEBAR_COLLAPSED_KEY` + `applySidebarWidth`. Add the `<style>`
tag with reduced-motion and focus-ring rules. Width animates on toggle. No content
changes yet.

**Acceptance:**
- [ ] `--sidebar-glass-bg`, `--sidebar-glass-border`, `--sidebar-glass-shadow` defined in both theme blocks.
- [ ] Sidebar is `position: fixed`, island has 16px margin all sides, `borderRadius: 18`, correct glass surface.
- [ ] Page content visible through the glass when content is scrolled behind the island.
- [ ] `--sidebar-w` written to `<html>` on mount (no transition) and on toggle (with transition).
- [ ] Main content `marginLeft` animates with sidebar width.
- [ ] `isCollapsed` state initialised from localStorage; toggles and persists.
- [ ] Island width transitions on toggle.
- [ ] `npm run typecheck` — 0 errors.

**Files:** `src/index.css`, `src/components/layout/Sidebar.tsx`, `src/App.tsx`

---

### Task 2 — Collapsed Content & Animations

**Description:** Apply label opacity/translate animations to nav item labels, section
headers, search, portfolio stats, keyboard hints and user area. Implement toggle button
(chevron, top-right of branding row). Reposition dark-mode toggle for collapsed state.
Apply `aria-expanded`, `aria-label`, `aria-hidden` to affected elements.

**Acceptance:**
- [ ] Collapsed: only icons, `BrandMark`, toggle chevron, dark-mode button, avatar, sign-out icon visible.
- [ ] Expanded: all content visible, nothing clipped or truncated.
- [ ] Label expand has 100ms delay — width opens first, then text fades in.
- [ ] Label collapse: text fades immediately, then width closes.
- [ ] Nav icons centred in collapsed state (`justifyContent: "center"`).
- [ ] Search `aria-hidden="true"` + `tabIndex={-1}` when collapsed.
- [ ] Toggle button has correct `aria-label` and `aria-expanded`.
- [ ] `npm run typecheck` — 0 errors.

**Files:** `src/components/layout/Sidebar.tsx`

---

### Task 3 — Tooltips, Polish & QA

**Description:** Add `rs-nav-item` + `rs-nav-tooltip` to nav items. Implement tooltip
CSS in the `<style>` tag — dark glass, `pointer: fine` guarded, slide+fade animation.
Run all 15 manual checkpoints. Take 4 screenshots.

**Acceptance:**
- [ ] Tooltip appears to the right of the island on hover, collapsed state only.
- [ ] Tooltip is dark glass (`rgba(18, 20, 30, 0.82)` + blur) — dark in both light and dark schemes.
- [ ] Tooltip does NOT appear in expanded state (span not in DOM when expanded).
- [ ] `@media (pointer: fine)` guard in place.
- [ ] `@media (prefers-reduced-motion: reduce)` makes all transitions instant.
- [ ] All 15 manual checkpoints pass.
- [ ] `npm run build` — clean; recharts chunk still split separately.
- [ ] 4 screenshots attached (expanded/collapsed × light/dark).

**Files:** `src/components/layout/Sidebar.tsx`

---

## Success Criteria

- [ ] `npm run typecheck` — 0 errors.
- [ ] `npm run build` — clean build.
- [ ] Sidebar is `position: fixed`, floating island with 16px margin, 18px border-radius.
- [ ] Glass is genuinely translucent — app content visible through the panel.
- [ ] Collapse/expand spring-animates at 300ms; labels fade with correct delay.
- [ ] Collapsed state: icon rail at 68px outer, comfortable icon spacing.
- [ ] Tooltips: dark glass, slide+fade, collapsed only, pointer-fine only.
- [ ] Main content `marginLeft` animates in sync with sidebar via `--sidebar-w`.
- [ ] No flash of wrong collapsed/expanded state on cold load.
- [ ] `prefers-reduced-motion: reduce` — all transitions instant (DevTools verified).
- [ ] Sidebar `zIndex: 50` — modals and toasts render above it.
- [ ] All 6 demo accounts: permission-gated nav items correct in both states.
- [ ] Active route highlights correctly in both states.
- [ ] No regressions: search, portfolio stats, user sign-out, theme toggle, branding.
- [ ] Zero new npm dependencies.
- [ ] Only three files modified: `Sidebar.tsx`, `App.tsx`, `index.css`.

---

## Out of Scope

- Redesigning any other part of the UI to match this sidebar style (that follows later).
- Animating the sidebar's vertical position or adding entrance animations on load.
- Mobile or responsive breakpoints — this is a desktop PMO tool.
- Any change to routing, auth, data loading, or theming beyond the three CSS variables.

---

## Open Questions

None. All decisions confirmed via structured pre-implementation interview (June 2026).

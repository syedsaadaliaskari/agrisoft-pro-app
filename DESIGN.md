# Agri Soft Pro — shared light-theme spec (sync with desktop)

Source of truth: Agri Soft Pro desktop (Electron + Next.js).

This file exists so web/mobile/other apps stay visually in sync.

- Do not add a second palette.
- Do not use dark-theme tokens here.
- Light theme only.
- Import tokens from `constants/theme.ts` (native) or `constants/agri-desktop-sync.css` (web). Do not scatter hex values.

## 1. CSS variables (copy exactly)

See `constants/agri-desktop-sync.css`.

```css
:root,
[data-theme="light"] {
  --bg: #f3f5f8;
  --bg-elevated: #ffffff;
  --bg-soft: #e9eef3;
  --border: #d3dae3;
  --border-strong: #b5c0ce;
  --text: #1a2330;
  --text-muted: #5c6b7d;
  --accent: #2a8f9a;
  --accent-hover: #237a83;
  --accent-soft: rgba(42, 143, 154, 0.12);
  --success: #2f7d55;
  --danger: #c43d3d;
  --info: #3a79b8;
  --logo-ink: #f4fbfc;
  --atmosphere-1: rgba(42, 143, 154, 0.09);
  --atmosphere-2: rgba(58, 121, 184, 0.06);
  --sidebar-width: 260px;
  --font-display: "Segoe UI", "Segoe UI Variable", system-ui, sans-serif;
  --font-body: "Segoe UI", "Segoe UI Variable", system-ui, sans-serif;
}
```

Urdu locale fonts (when `lang=ur`): `"Nirmala UI", "Segoe UI", "Noto Nastaliq Urdu", Tahoma, sans-serif`

## 2. What each token is for

| Token | Hex / value | Use |
| --- | --- | --- |
| `--bg` | `#f3f5f8` | App canvas |
| `--bg-elevated` | `#ffffff` | Cards, tables, sidebar, topbar, modals |
| `--bg-soft` | `#e9eef3` | Table header, hover row, chip fill, input-adjacent panels |
| `--border` | `#d3dae3` | Default 1px lines |
| `--border-strong` | `#b5c0ce` | Hover border, scrollbar thumb |
| `--text` | `#1a2330` | Titles, amounts, primary copy |
| `--text-muted` | `#5c6b7d` | Labels, hints, dates, section caps |
| `--accent` | `#2a8f9a` | Primary buttons, active nav, focus ring, brand teal |
| `--accent-hover` | `#237a83` | Primary button hover |
| `--accent-soft` | `rgba(42,143,154,0.12)` | Active nav bg, selected chip |
| `--success` | `#2f7d55` | In / paid / posted / cash-in |
| `--danger` | `#c43d3d` | Out / error / delete / loss |
| `--info` | `#3a79b8` | Bank / informational |
| `--logo-ink` | `#f4fbfc` | Text on primary (accent) buttons |
| Due / leftover | Tailwind amber-600 `#d97706` | Amount still owing (not a CSS var) |

Page wash (fixed, behind content):

```css
background-image:
  radial-gradient(ellipse 80% 50% at 10% -10%, var(--atmosphere-1), transparent),
  radial-gradient(ellipse 60% 40% at 100% 0%, var(--atmosphere-2), transparent);
```

## 3. Type

- UI font: Segoe UI
- Page title (topbar): 18px / semibold
- Section titles: 14–16px semibold
- Body / table cells: 14px
- Labels: 12px medium, muted
- Micro / overline: 11px uppercase tracking-wide/wider, muted
- Tabular numbers on all money: `tabular-nums`, never wrap mid-number
- Money format: `Rs 1,234.56` (symbol, space, 2 decimals)

## 4. Shape and space

- Inputs / buttons: 8px (`rounded-lg`)
- Cards / tables / composer: 12px or 16px (`rounded-xl` / `rounded-2xl`)
- Pills / status badges: `rounded-full`
- Logo / icon wells: 8px (`rounded-lg`)
- Page padding: 24px
- Topbar height: 64px
- Sidebar width: 260px, fixed left, elevated bg, border-end
- Main offset (desktop): `margin-inline-start: 260px`
- Card padding: 16px
- Table cell: 16px × 12–14px
- Gaps: 8 / 12 / 16 / 24
- No drop shadows on cards. Modals may use a large shadow.
- Focus: 1px ring `--accent`

## 5. Shell layout

```
[ Sidebar 260px ][ Topbar 64px: title left, lang/user right ]
                 [ Main p-6 ]
```

On phone, the 260px sidebar is a drawer. Same tokens, same brand block.

- Sidebar brand: 36×36 logo, name semibold, “PRO” 11px uppercase tracking, accent color
- Nav groups: collapsible, icon 16px, item 13px
- Active group/item: `--accent-soft` + `--accent`
- Inactive item: `--text-muted`, hover `--bg-soft`

## 6. Buttons

- primary: bg `--accent`, text `--logo-ink`, hover `--accent-hover`
- secondary: border + `--bg-soft`, text, hover `--border-strong`
- danger: danger/10 fill, danger text, danger/40 border
- ghost: muted text, hover `--bg-soft`
- sizes: sm = 12px · md = 14px
- icon + label gap 6px
- disabled: opacity 50%

## 7. Fields

- Label above, 12px muted
- Control: full width, 8px radius, border, background is `--bg` (page grey) not white
- Padding ~12px × 8px, 14px text
- Error: border `--danger` + 12px danger message
- Hint: 11px muted

## 8. Lists and documents

List page:

- KPI strip: 2–4 cards, 12–16px radius, border, elevated bg, 11px uppercase muted label, large tabular value
- Toolbar: search + New + export/print
- Filter chips: 8px radius, active = accent border + accent-soft
- Table: overflow hidden, 12–16px radius, header `--bg-soft` 11px uppercase, rows hover `--bg-soft`

Document composer (sale, purchase, receive, pay, income, expense):

- Full composer, not a skinny side form
- Header fields on top
- Totals: label left, amount right, tabular, nowrap
- Status pills: posted/completed = success/15; credit/due = amber; deleted = danger/15

## 9. Payment

Big tappable modes, not accounting widgets:

- Cash | Bank | Credit | Cash + Bank
- Active: accent border + accent-soft + accent label
- Inactive: border + `--bg`
- Grid: 3 modes → 3 columns; 4 modes → 2×2
- Button pad, label semibold
- Cash = whole amount to cash; Bank = whole to bank; Credit = 0/0; Cash+Bank = two number fields
- Do not show shop-wide cash/bank running totals on the voucher
- Receive/Pay/Income/Expense: Cash or Bank only (no credit)

## 10. Motion

- Page enter: fade 180ms ease-out, 4px up
- Respect reduced motion
- Skeleton: pulse on border

## 11. Copy tone

- Short shop labels. No tutorial essays.
- English default; Urdu optional via same keys
- Status words: Posted, Credit, Cash, Bank

## 12. Agent rules

- Put this spec in its own file. Import tokens from there. Do not scatter hex values.
- If a color is missing, reuse accent / success / danger / info / amber-due. Do not invent a fifth brand color.
- If layout is missing, copy the desktop shell + composer pattern above.
- Light theme only unless the product owner later adds dark.

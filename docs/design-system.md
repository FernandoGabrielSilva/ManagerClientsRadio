# Design System — ManagerClientsRadio

## Theme & Tokens
- Tailwind CSS v4 (CSS-first, no `tailwind.config`). Tokens defined as CSS variables in `app/globals.css` under `@theme inline`.
- Base tokens: `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1..5`, `--sidebar-*`, `--radius: 0.75rem`.
- Radius scale: `--radius-sm/md/lg/xl/2xl/3xl/4xl`.
- Font: Plus Jakarta Sans (`--font-jakarta`) for sans/heading; Geist Mono for mono.
- Light/dark plus 9 presets (`theme-default`, `ocean`, `sunset`, `forest`, `midnight`, `rose`, `amber`, `violet`, `teal`) applied as classes on `<html>`.
- Runtime theme color customization via `applyThemeColor` (hex → oklch), stored on `User.themeColor`.
- Dark variant: `custom variant dark (&:is(.dark *))`.

## Layout
- Desktop: fixed sidebar `hidden md:flex w-64`, main content `flex-1 p-4 md:p-6`, container `mx-auto w-full`.
- Mobile: hamburger opens `Sheet` (left, `w-72`) with grouped nav; sidebar hidden.
- Topbar: sticky, `h-14`, backdrop blur, z-30.
- Page header: `PageHeader` component (title + description + actions).
- Cards: `Card`/`CardContent` with `overflow-hidden` for tables; `p-4`/`p-5` for content.

## Spacing & Typography
- Section spacing: `space-y-4`/`space-y-6`.
- Card padding: `p-4`, `p-5`, table cells `px-4 py-3`, `px-5 py-3`.
- Headings: `text-2xl font-bold tracking-tight` (page), `text-sm font-semibold` (section).
- Body: `text-sm`; muted: `text-xs text-muted-foreground`.
- Numbers: `tabular-nums`.

## Colors (semantic)
- Primary actions: `bg-primary text-primary-foreground`.
- Destructive: `variant="destructive"`.
- Status badges: `variant="outline"`/`"secondary"`, colored via conditional classes (green/amber/red).
- Muted backgrounds: `bg-muted`, `bg-muted/40` for table headers.
- Zebra rows: `bg-muted/40` header, data rows alternate subtle.

## Icons
- `lucide-react` exclusively. Size `h-4 w-4` (inline) or `h-5 w-5` (cards).
- Icons paired with labels in buttons (`mr-2`).

## Responsive
- Breakpoints: `sm`, `md`, `lg`, `xl`.
- Grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/5`.
- Forms: `grid gap-4 md:grid-cols-2`.
- Buttons: `w-full sm:w-auto`; toolbars `flex-col sm:flex-row`.
- Tables: horizontal scroll with `min-w-[700-900px]`, `overflow-x-auto`.
- Text truncation with `min-w-0` + `truncate`.

## Constraints
- Do not introduce new colors/spacing outside tokens.
- Do not change base shadcn component styles unless necessary.
- Reuse `PageHeader`, `Card`, `Button`, `Table`, `Dialog`, `Select`, `Input`, `Badge`, `toast` patterns.

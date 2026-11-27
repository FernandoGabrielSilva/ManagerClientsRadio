# Component Patterns — ManagerClientsRadio

## shadcn/ui (standard library)
- Button, Input, Label, Textarea, Select, Checkbox, Switch, Dialog, Sheet, Table, Badge, Card, Calendar, Popover, Tooltip, Avatar, DropdownMenu, Toast (base-ui).
- Do not use `window.alert`/`window.confirm`; use `Dialog` for confirmations.
- Do not install duplicate component libraries.

## Forms
- React Hook Form + Zod resolver; schemas in `lib/validators.ts`.
- Controlled inputs with `register`/`setValue`/`watch`; or state objects for simple dialogs.
- Currency/phone/CPF/CNPJ masking helpers in form components.
- Submit → server action → `toast.add` for result; inline `<p className="text-destructive">` for field errors.
- Cancel button `variant="outline"`.

## Tables (shared UX)
- Files: `clients-table.tsx`, `contract-table.tsx`, `reminders-view.tsx`, `trash-view.tsx`.
- Pattern: search Input, filter Select(s), SortFilter, view tabs (active/archived/trash), pagination (PAGE_SIZE 10/15), long-press selection (450ms), bulk action bar, confirm Dialog, empty state, horizontal scroll.
- Row click navigates to detail when no selection; pencil button opens edit dialog (stops propagation).

## Dialogs
- Create/edit forms in `Dialog` with `max-w-3xl max-h-[90vh] overflow-y-auto`.
- Confirmation: `Dialog` + `DialogTitle` + message + footer (outline Cancel + destructive Confirm).

## Toast
- `toast.add({ title, description?, type? })` from `@/components/ui/toast`.
- Global `Toaster` in root layout.

## Filters & Search
- Text search across multiple fields.
- `Select` for type/status/vendor.
- `SortFilter` value format `field|dir`.
- Client-side filtering/sorting over server-provided base data.

## Loading
- Background jobs use `BackgroundJobStatus` polling (1.5s).
- Buttons show `...` text while submitting.

## Notifications
- Server-fetched in layout; browser notifications via service worker.

## Import/Export
- `import-export.tsx` components; styled XLSX via `xlsx-js-style`.
- Template cloning for full workbook export.
- Background jobs for import progress.

## Accessibility
- Use semantic labels, `aria-label` on icon buttons.
- Keyboard-friendly shadcn components.

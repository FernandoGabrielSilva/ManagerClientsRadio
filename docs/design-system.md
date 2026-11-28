# Design System — ManagerClientsRadio

Identidade visual real do projeto, extraída de `app/globals.css`, `app/layout.tsx`, `components/ui/*` e das páginas existentes.

## Stack visual

- Next.js 16 (App Router), React 19, TypeScript.
- Tailwind CSS v4 (CSS-first, sem `tailwind.config`); tokens em `app/globals.css` com `@theme inline`.
- shadcn/ui (`components.json`: style `base-nova`, baseColor `neutral`, CSS variables, RSC, TSX).
- `lucide-react` como única biblioteca de ícones.
- `class-variance-authority` + `clsx` + `tailwind-merge` (`cn` em `lib/utils.ts`).
- `next-themes` para claro/escuro.

## Tokens de cor (OKLCH)

### Light (`:root`)

| Token | Valor | Uso |
|---|---|---|
| `--background` | `oklch(0.985 0.006 250)` | fundo da aplicação |
| `--foreground` | `oklch(0.22 0.035 255)` | texto principal |
| `--card` | `oklch(1 0 0)` | superfície de card |
| `--popover` | `oklch(1 0 0)` | popovers/dialogs |
| `--primary` | `oklch(0.46 0.15 255)` | azul royal; ações primárias |
| `--primary-foreground` | `oklch(0.99 0 0)` | texto sobre primary |
| `--secondary` | `oklch(0.955 0.012 250)` | superfície secundária |
| `--muted` | `oklch(0.96 0.009 250)` | fundos suaves |
| `--muted-foreground` | `oklch(0.53 0.025 255)` | texto auxiliar |
| `--accent` | `oklch(0.93 0.025 250)` | hover/seleção |
| `--destructive` | `oklch(0.56 0.21 25)` | erro/exclusão |
| `--border` | `oklch(0.91 0.012 250)` | bordas |
| `--input` | `oklch(0.90 0.015 250)` | borda de input |
| `--ring` | `oklch(0.55 0.14 255)` | foco |
| `--chart-1..5` | azuis 255→220 | gráficos |
| `--sidebar*` | variações do fundo/primary | sidebar |

### Dark (`.dark`)

| Token | Valor |
|---|---|
| `--background` | `oklch(0.145 0.025 255)` |
| `--foreground` | `oklch(0.96 0.012 245)` |
| `--card` | `oklch(0.19 0.028 255)` |
| `--popover` | `oklch(0.20 0.03 255)` |
| `--primary` | `oklch(0.72 0.12 250)` |
| `--primary-foreground` | `oklch(0.16 0.035 255)` |
| `--muted` | `oklch(0.23 0.025 255)` |
| `--muted-foreground` | `oklch(0.68 0.025 245)` |
| `--border` | `oklch(1 0 0 / 9%)` |
| `--input` | `oklch(1 0 0 / 12%)` |

### Temas (presets)

Classes aplicadas no `<html>`: `theme-default`, `theme-ocean`, `theme-sunset`, `theme-forest`, `theme-midnight`, `theme-rose`, `theme-amber`, `theme-violet`, `theme-teal` (cada uma com variante `.dark.theme-*`). Tema customizado em runtime via `applyThemeColor` (hex → OKLCH), persistido em `User.themeColor`/`User.themeMode`.

Regra: usar sempre tokens semânticos (`bg-primary`, `text-muted-foreground`, `border-border`), nunca hex/rgb soltos.

## Tipografia

- Sans/heading: **Plus Jakarta Sans** (`--font-jakarta`), pesos 300–800.
- Mono: **Geist Mono** (`--font-geist-mono`).
- `font-feature-settings: "cv02", "cv03", "cv04", "cv11"`.
- Título de página: `text-2xl font-bold tracking-tight`.
- Título de seção: `text-sm font-semibold text-foreground` (form) ou `text-sm font-semibold text-foreground/80` (dashboard).
- Título de card: `text-base font-medium` (`CardTitle`).
- Corpo: `text-sm`; auxiliar: `text-xs text-muted-foreground`.
- Números: `tabular-nums`.

## Raios, sombras e bordas

- `--radius: 0.75rem` (12px).
- `rounded-lg`: botões, inputs, selects, textareas.
- `rounded-xl`: cards, dialogs, sheet.
- `rounded-4xl`: badges.
- `rounded-full`: avatares, pills, ícones de topbar.
- Card: `ring-1 ring-foreground/10 shadow-sm`.
- Popover/dropdown/dialog: `ring-1 ring-foreground/10 shadow-md`.
- Topbar/sidebar: `border-b`/`border-r`.

## Espaçamento

- Página de lista: `space-y-4`; página composta: `space-y-6`.
- Main: `p-4 md:p-6`.
- Container: `mx-auto w-full space-y-6`.
- Grid de cards: `gap-4`; grid de stats: `gap-4`.
- Formulário: `space-y-6`; campo `space-y-2`; grid `gap-4 md:grid-cols-2`.
- Tabela: `p-2` (base) ou `px-4 py-3`; container `p-4 space-y-3`.
- Seções do dashboard: `space-y-3`.

## Layout

- Sidebar desktop: `hidden md:flex w-64 flex-col border-r bg-sidebar`.
- Sidebar mobile: `Sheet` left `w-72`, mesmos grupos/itens de `lib/navigation.ts` (`navGroups`).
- Item ativo com `aria-current="page"`; ícones decorativos com `aria-hidden="true"`.
- Topbar: `sticky top-0 z-30 h-14 border-b bg-background/80 backdrop-blur-md px-4 md:px-6`.
- Main: `flex-1 p-4 md:p-6`; container `mx-auto w-full space-y-6`.
- Página de lista: toolbar → `Card overflow-hidden` → `CardContent p-0` → tabela.
- Página de detalhe: header com avatar/ícone + título/subtítulo + ações; grid de cards.
- Dashboard: stats `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4`; seções `space-y-3` com título `text-sm font-semibold text-foreground/80`; lembretes/contratos em `grid-cols-1 lg:grid-cols-2 gap-4`; lista de contratos com filtro `Select` (padrão paginação) e scroll `max-h-[360px]`.

## Componentes visuais de referência

- **PageHeader** (`components/layout/page-header.tsx`): `flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between`; título `text-2xl font-bold tracking-tight`; descrição `text-sm text-muted-foreground`; ações `flex flex-wrap items-center gap-2`.
- **Toolbar de lista**: tile `h-10 w-10 rounded-lg bg-primary/10 text-primary` + título + contagem; ações à direita.
- **Card de stat**: `Card overflow-hidden` → `CardContent p-5 flex items-center gap-4`; ícone `h-11 w-11 rounded-lg bg-muted`.
- **Card informativo**: `rounded-lg border p-4`; ícone `h-9 w-9 rounded-lg bg-primary/10 text-primary`.
- **Empty state**: `border rounded-lg p-8/p-10 text-sm text-muted-foreground text-center`.
- **Badge de status**: `Badge variant="outline"`/`"secondary"`; cores pontuais (`text-emerald-500`, `text-amber-500`, `text-destructive`).

## Botões

`Button` (`components/ui/button.tsx`):
- Variantes: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`.
- Tamanhos: `default` h-9, `sm` h-7, `xs` h-6, `lg` h-9, `icon` size-8, `icon-sm` size-7, `icon-xs` size-6, `icon-lg` size-9.
- Ícone + texto: `mr-2` no ícone ou `gap-1.5`.
- Ações destrutivas: `variant="destructive"`.

## Inputs e formulários

- `Input`: `h-9 rounded-lg border-input px-3`, foco `ring-3 ring-ring/50`.
- `Textarea`: `min-h-16 rounded-lg`.
- `SelectTrigger`: `h-8 rounded-lg` (default) / `h-7` (sm).
- `Label`: `text-sm font-medium`.
- Erro: `text-sm text-destructive`.
- Checkbox/Switch: shadcn (Radix).

## Tabelas

- `Table` base: `w-full text-sm`, header `border-b`, row `border-b hover:bg-muted/50`.
- Listas: container `max-h-[420px] overflow-auto border rounded-md`; tabela `min-w-[700px]` a `min-w-[900px]`; wrapper interno do `Table` neutralizado para um único container de scroll.
- Cabeçalho de lista: `bg-muted/40 hover:bg-muted/40`.
- Sem zebra; o destaque é hover e cabeçalho.
- Números/datas: `tabular-nums`.

## Dialogs e overlays

- `DialogContent`: `max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] rounded-xl bg-popover p-4 ring-1 ring-foreground/10`.
- Formulários: `max-w-3xl max-h-[90vh] overflow-y-auto`.
- `DialogFooter`: `-mx-4 -mb-4 border-t bg-muted/50 p-4`.
- `Sheet` para navegação mobile.

## Ícones

- `lucide-react` exclusivamente.
- Ícones decorativos / em botões com texto: `aria-hidden="true"`; botões só com ícone exigem `aria-label`.
- Inline: `h-4 w-4`.
- Tile/card: `h-5 w-5` ou `h-9 w-9`/`h-10 w-10`/`h-11 w-11` no container.
- Ícone em botão: `mr-2` (com texto) ou centralizado (icon button).

## Responsividade

- Mobile-first; breakpoints `sm`, `md`, `lg`, `xl`.
- Grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/5`.
- Toolbars `flex-col sm:flex-row`; botões `w-full sm:w-auto`.
- Tabelas sempre container com scroll nos dois eixos + `min-w`.
- Texto truncado com `min-w-0` + `truncate`.

## Páginas de referência

- `app/(dashboard)/clients/page.tsx` + `components/clients/*` — lista CRUD canônica.
- `app/(dashboard)/contracts/page.tsx` + `components/contracts/*` — lista CRUD com detalhe em cards.
- `app/(dashboard)/dashboard/page.tsx` — visão geral com stats, calendário e listas.
- `app/(dashboard)/settings/page.tsx` + `components/settings/settings-view.tsx` — página com abas customizadas e ARIA (padrão-alvo: `Tabs`).

## Restrições

- Não criar estilo novo por funcionalidade.
- Não alterar tokens globais para uma tela isolada.
- Não trocar fonte, raio ou paleta sem pedido explícito.
- Reutilizar `PageHeader`, `Card`, `Button`, `Table`, `Dialog`, `AlertDialog`, `Select`, `Input`, `Badge`, `toast`.
- `Dialog` fica reservado a formulários/fluxos com múltiplas decisões; confirmações destrutivas usam `AlertDialog`.
- Cores pontuais hardcoded (`text-emerald-500`, `text-amber-500`, `text-green-600`, `bg-sky-100`) são desvio conhecido; novos tokens só com pedido explícito.
- Dark mode usa os mesmos tokens com variantes `.dark` e `.dark.theme-*` em OKLCH; não criar estilo novo por funcionalidade.

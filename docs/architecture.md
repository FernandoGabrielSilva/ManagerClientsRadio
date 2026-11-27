# Architecture — ManagerClientsRadio

## Stack

- Next.js 16 (App Router), React 19, TypeScript.
- Tailwind CSS v4 + shadcn/ui (`base-nova`, `neutral`, CSS variables).
- Prisma 7 + PostgreSQL (Neon), NextAuth v5 (Credentials + Google, JWT).
- Zod 4, React Hook Form 7.
- `xlsx`/`xlsx-js-style`, `jspdf`/`jspdf-autotable`, `googleapis`, `date-fns`, `lucide-react`.

## Route Groups

- `(auth)`: `/login`, `/register`.
- `(dashboard)`: páginas autenticadas; layout valida sessão e usuário.
- `(public)`: `/privacidade`, `/termos`.
- `api`: `auth/[...nextauth]`, `cron/notifications`, `google/sync`.

Páginas principais: `/dashboard`, `/clients`, `/clients/new`, `/clients/[id]`, `/contracts`, `/contracts/new` (redirect), `/contracts/[id]`, `/reminders`, `/spreadsheet`, `/trash`, `/settings`, `/notifications`, `/calendar` (redirect para `/dashboard`).

## Auth & Proxy

- `proxy.ts` (middleware replacement) verifica JWT via `getToken` e redireciona não autenticados para `/login`.
- `auth.ts`: NextAuth com Credentials + Google; sessão JWT; secret `AUTH_SECRET ?? NEXTAUTH_SECRET`.
- Papéis: `admin` (vê tudo) e `vendor` (vê `userId`/`vendorId`).
- Layout `(dashboard)/layout.tsx` busca o usuário no Prisma e redireciona se não existir.

## Data Layer

- `lib/db.ts`: Prisma client com adapter Neon.
- `prisma/schema.prisma`: modelos `User`, `Client`, `Contract`, `Reminder`, `Event`, `Notification`, `BackgroundJob`, `ContactHistory` etc.
- Soft delete `deletedAt`; arquivamento `archivedAt`.
- `lib/validators.ts`: schemas Zod (`clientSchema`, `contractSchema`, `reminderSchema`, `eventSchema`, `themeSchema`, `profileSchema`, `passwordSchema`, `loginSchema`, `registerSchema`).

## Server Actions (`app/actions/*`)

- `auth.ts`, `clients.ts`, `contracts.ts`, `reminders.ts`, `events.ts`, `notifications.ts`, `settings.ts`, `spreadsheet.ts`, `background-jobs.ts`, `trash.ts`.
- Padrão: validar Zod → checar auth/ownership → mutar Prisma → `revalidatePath`.
- Retorno: `{ success: true }` ou `{ error: "mensagem" }`.
- Operações em lote recebem arrays de IDs e validam escopo.

## Regras de negócio compartilhadas (`lib/`)

- `date-utils.ts`: contato atrasado, vídeo do dia, contrato a vencer, próxima data, formatação.
- `spreadsheet.ts`: modelo de 6 abas, `OPTION_LISTS`, `SHEET_LABELS`, `diffDays`, `toDate`.
- `export-excel.ts`, `export-workbook.ts`, `export-template.ts`: exportação XLSX/PDF.
- `color-utils.ts`: presets de tema e `applyThemeColor` (hex → OKLCH).
- `background-jobs.ts`: criação/execução de jobs.
- `google-calendar.ts`: sincronização.

## Funcionalidades compartilhadas

- Eventos de contato automáticos (`ensureClientContactEventsForUser`).
- Jobs em background para importação/sincronização; UI faz polling.
- Google Calendar (opcional): criar/remover/sincronizar eventos.
- Notificações in-app + navegador (service worker `/sw.js`).
- Importação/exportação XLSX/PDF com modelo unificado.
- Temas claro/escuro/presets persistidos no usuário.
- Lixeira unificada de clientes, contratos e lembretes.

## Convenções

- Server Components buscam dados; Client Components chamam server actions.
- Nunca acessar banco em Client Component.
- Aplicar escopo por papel em toda query.
- `revalidatePath` após mutações; `router.refresh()` no cliente.
- Reutilizar componentes e serviços existentes; não criar sistemas independentes.
- Documentar novos padrões em `docs/`.

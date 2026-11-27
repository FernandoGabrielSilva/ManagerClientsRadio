# Architecture — ManagerClientsRadio

## Stack
- Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui.
- Prisma 7 + PostgreSQL (Neon), NextAuth v5 (JWT), Zod 4, React Hook Form 7.
- `xlsx-js-style`, `jspdf`, `googleapis`.

## Route Groups
- `(auth)`: login, register.
- `(dashboard)`: all authenticated pages; layout checks session and redirects.
- `(public)`: landing, privacy, terms.
- `api`: auth, cron notifications, google sync.

## Auth & Proxy
- `proxy.ts` (middleware replacement) checks JWT via `getToken`, redirects unauthenticated to `/login`.
- `auth.ts` NextAuth with Credentials + Google; session strategy JWT; `secret` from `AUTH_SECRET ?? NEXTAUTH_SECRET`.
- Role-based: `admin` vs `vendor`.

## Data Layer
- `lib/db.ts` Prisma client (Neon adapter).
- Server actions in `app/actions/*` validate with Zod, enforce auth/ownership, mutate Prisma, `revalidatePath`.
- Soft delete/archive via `deletedAt`/`archivedAt` on Client/Contract/Reminder.

## Shared Functionality
- Client contact events auto-generated (`ensureClientContactEventsForUser`).
- Background jobs for import/sync (`BackgroundJob`).
- Google Calendar sync (optional).
- Notifications (in-app + browser).

## Feature Parity
- Clients, Contracts, Reminders share table UX (search, filters, sort, pagination, selection, bulk actions, view tabs).
- Trash page unifies deleted clients/contracts/reminders.
- Spreadsheet import/export follows unified template.

## Conventions
- Server Components fetch data; Client Components call server actions.
- Role-based filtering in all queries.
- Revalidate paths after mutations.
- Do not create independent systems for global features.

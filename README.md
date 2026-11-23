# ManagerClientsRadio

Plataforma interna para gerenciar clientes, contratos e lembretes de uma agência de marketing.

## Stack

Next.js (App Router), NextAuth.js, NeonDB (PostgreSQL), Prisma ORM, shadcn/ui, Tailwind CSS.

## Setup

1. Instale dependências:
   ```bash
   npm install
   ```
2. Configure o `.env` (copie de `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Preencha `DATABASE_URL` (Neon), `NEXTAUTH_SECRET`, e (opcional) Google OAuth.
3. Gere o client e rode migrações:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```
4. (Opcional) Seed:
   ```bash
   npx prisma db seed
   ```
5. Rode em dev:
   ```bash
   npm run dev
   ```

## Deploy (Vercel + Neon)

- Crie um banco no Neon e copie a connection string para `DATABASE_URL`.
- Configure as env vars na Vercel.
- O cron diário está em `vercel.json`.

## Login demo

`demo@manager.com` / `password123`

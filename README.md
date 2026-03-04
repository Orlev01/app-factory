# App Factory Template

A Next.js 15 starter template with authentication, database, and email built in.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Auth**: Auth.js v5 (email/password with verification)
- **Database**: Neon Postgres via Drizzle ORM
- **Email**: Resend
- **UI**: shadcn/ui + Tailwind CSS v4

## Prerequisites

- Node.js 18+
- pnpm
- [Neon](https://neon.tech) account (free tier)
- [Resend](https://resend.com) account (free tier)

## Setup

1. **Clone and install**
   ```bash
   pnpm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your values:
   - `DATABASE_URL` — from Neon dashboard
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `RESEND_API_KEY` — from Resend dashboard
   - Update `NEXT_PUBLIC_APP_NAME` with your app name

3. **Set up database**
   ```bash
   pnpm db:push
   ```

4. **Run development server**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Database Commands

| Command | Description |
|---|---|
| `pnpm db:push` | Push schema to database (dev) |
| `pnpm db:generate` | Generate migration files |
| `pnpm db:migrate` | Run migrations (production) |
| `pnpm db:studio` | Open Drizzle Studio GUI |

## Deploy to Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Add environment variables
4. Deploy

See `.claude/skills/deployment.md` for detailed deployment notes.

## What to Modify Per App

- `NEXT_PUBLIC_APP_NAME` in `.env.local`
- Add new pages under `src/app/(protected)/`
- Add new database tables in `src/lib/db/schema.ts`
- Add new server actions in `src/lib/`

## Project Structure

```
src/
  app/
    (auth)/          # Auth pages (sign-in, sign-up, etc.)
    (protected)/     # Authenticated pages
    api/auth/        # Auth.js API route
  components/
    auth/            # Auth form components
    nav/             # Navigation components
    ui/              # shadcn/ui components
  lib/
    db/              # Database schema and client
    auth.ts          # Auth.js configuration
    auth-actions.ts  # Auth server actions
    email.ts         # Email sending
    utils.ts         # Utility functions
```

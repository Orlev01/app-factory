# app-factory-template

A Next.js 16 full-stack starter with authentication, Postgres, and email — ready to clone and build on. This repo is the template used by `app-factory-cli` to provision new apps.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Auth | Auth.js v5 — JWT strategy, Credentials provider |
| Database | Neon Postgres via Drizzle ORM (HTTP driver) |
| Email | Resend |
| UI | shadcn/ui + Tailwind CSS v4 + Lucide icons |
| Package manager | pnpm |
| Testing | Vitest |

## What's Included Out of the Box

- Sign-up with email verification
- Sign-in (email + password, bcrypt)
- Forgot password / reset password flow (email link, 1-hour expiry)
- JWT sessions (Auth.js v5, stateless)
- Drizzle schema with users, sessions, verification tokens, password reset tokens
- Navbar with user dropdown (sign out)
- Warm brand design system (Burnt Orange / Terracotta / Cream)
- Type-safe env var validation at startup (Zod)
- `ActionState` pattern for all server actions (works with `useActionState`)

## Quick Start

```bash
cp .env.example .env.local
# Fill in .env.local with your credentials

pnpm install
pnpm db:push      # Push schema to your Neon database
pnpm dev          # http://localhost:3000
```

## Environment Variables

```bash
# Neon Postgres
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"

# Auth.js (generate secret: openssl rand -base64 32)
AUTH_SECRET="..."
AUTH_URL="http://localhost:3000"

# Resend
RESEND_API_KEY="re_..."
EMAIL_FROM="App Factory <noreply@yourdomain.com>"

# App
NEXT_PUBLIC_APP_NAME="My App"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

All variables are validated at startup via `src/lib/env.ts` (Zod). Missing or malformed values fail fast with a clear error.

## Key Commands

```bash
pnpm dev           # Dev server (localhost:3000)
pnpm build         # Production build
pnpm test          # Run tests (Vitest)
pnpm db:push       # Push schema to dev DB (no migration files)
pnpm db:generate   # Generate SQL migration files
pnpm db:migrate    # Run migrations (production)
pnpm db:studio     # Open Drizzle Studio (GUI)
```

## Project Structure

```
src/
  app/
    layout.tsx                        # Root layout — fonts, SessionProvider, Navbar, Toaster
    page.tsx                          # Landing page (public)
    (auth)/
      sign-in/page.tsx
      sign-up/page.tsx
      verify-email/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx
    (protected)/
      layout.tsx                      # Auth guard — redirects to /sign-in if unauthenticated
      dashboard/page.tsx              # User dashboard (starting point for your features)
    api/
      auth/[...nextauth]/route.ts     # Auth.js route handler (Node.js runtime)
  components/
    auth/                             # Auth form components (DO NOT MODIFY)
    nav/
      navbar.tsx                      # Top nav — safe to add links
      user-dropdown.tsx               # User menu — safe to add items
    ui/                               # shadcn/ui components
  lib/
    auth.ts                           # Auth.js config (JWT, Credentials, DrizzleAdapter)
    auth-actions.ts                   # Server actions: signUp, signInAction, verifyEmail, etc.
    email.ts                          # Resend email utility
    env.ts                            # Zod env validation (startup guard)
    types.ts                          # ActionState type
    utils.ts                          # cn() class-merge utility
    validations/
      auth.ts                         # Zod schemas for auth forms
    db/
      index.ts                        # Drizzle client (Neon HTTP driver)
      schema.ts                       # All tables: users, sessions, accounts, etc.
      migrate.ts                      # Migration runner (used by pnpm db:migrate)
  middleware.ts                       # Edge middleware — auth guard + public routes
```

## Adding Features

### New Protected Page

1. Create `src/app/(protected)/your-feature/page.tsx`
2. The `(protected)/layout.tsx` handles the auth guard automatically

### New Server Action

Create `src/lib/your-feature-actions.ts`:

```typescript
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ActionState } from "@/lib/types";

export async function myAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  // ... do work
  return { success: true, successMessage: "Done!" };
}
```

### New Database Table

Add to `src/lib/db/schema.ts` below the existing auth tables:

```typescript
export const todos = pgTable("todos", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
```

Then: `pnpm db:push` (dev) or `pnpm db:generate && pnpm db:migrate` (production).

### New Public Route

Add to the `publicRoutes` array in `src/middleware.ts`.

### New shadcn Component

```bash
pnpm dlx shadcn@latest add [component-name]
```

## Design System

Brand: **Burnt Orange (#CC5500) / Terracotta (#E2725B) / Cream (#FFF8E1)**

All colors are CSS custom properties in `src/app/globals.css` consumed as Tailwind semantic classes (`bg-primary`, `text-muted-foreground`, etc.). Never use raw hex values in components.

To re-skin: only modify the `:root` block in `globals.css`.

See `.claude/skills/design-system.md` for the full token reference.

## Auth Architecture

- **Strategy**: JWT (stateless, no DB roundtrip per request)
- **Session access**: `const session = await auth()` in Server Components / Server Actions
- **Credentials flow**: email → bcrypt verify → JWT issued
- **Email verification**: token stored in `verification_tokens` table, expires in 24h
- **Password reset**: token stored in `password_reset_tokens` table, expires in 1h
- **bcrypt**: runs in Node.js runtime only (not edge). The `[...nextauth]` route handler is pinned to Node.js runtime for this reason.
- **Middleware**: runs on Vercel Edge, reads JWT only (no bcrypt, no DB call)

## Known Limitations

- **JWT sessions are stateless**: After a password reset, existing sessions remain valid until they expire (default 30 days). Add a `tokenVersion` column to force immediate revocation if needed.
- **Credentials only**: No OAuth providers. The `accounts` table exists (required by DrizzleAdapter) but is unused. Add providers to `src/lib/auth.ts` — the schema is already compatible.
- **Email enumeration on sign-up**: The sign-up form reveals if an email is already registered (deliberate UX choice). The forgot-password flow does not leak this.
- **No rate limiting**: Auth endpoints are unprotected against brute force. Before production, add rate limiting (e.g., `@upstash/ratelimit`) to sign-in, sign-up, and forgot-password.

## Deployment (Vercel + Neon)

1. Push to GitHub
2. Import repo in Vercel
3. Set all environment variables (see `.env.example`)
4. Run `pnpm db:migrate` against your production Neon database before first deploy
5. Set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production domain

The Neon HTTP driver (`@neondatabase/serverless`) is used instead of connection pools, which avoids cold-start connection issues in serverless environments.

See `.claude/skills/deployment.md` for the full migration workflow and Vercel gotchas.

## For Agents

This project has detailed AI context in `.claude/`:

| File | Read when |
|---|---|
| `.claude/CLAUDE.md` | Always — quick reference and known limitations |
| `.claude/skills/project-conventions.md` | File ownership, action patterns, naming conventions |
| `.claude/skills/component-patterns.md` | Building UI — forms, toasts, loading states |
| `.claude/skills/database-patterns.md` | Adding tables, writing queries, migrations |
| `.claude/skills/design-system.md` | Colors, typography, spacing, component rules |
| `.claude/skills/deployment.md` | Env vars, Vercel config, migration workflow |

**Do not modify** auth files (`src/lib/auth.ts`, `src/lib/auth-actions.ts`, `src/app/(auth)/*`, `src/app/api/auth/*`) unless explicitly asked. All app features go in `src/app/(protected)/` and `src/lib/`.

# Agent Notes

## Package Manager
- Use `pnpm`. Lockfile is `pnpm-lock.yaml`.

## Dev Commands
- `pnpm dev` — Next.js 16 with Turbopack
- `pnpm build` — production build
- `pnpm lint` — ESLint (flat config, `eslint.config.mjs`)
- `pnpm format` — Prettier write on `**/*.{ts,tsx}`
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm db:generate` — Prisma client codegen
- `pnpm db:push` — Prisma db push (no migrations)

## Pre-commit
- `.husky/pre-commit` runs: `pnpm exec lint-staged && pnpm typecheck`
- lint-staged: `prettier --write` then `eslint --fix` on staged `*.{ts,tsx}`
- **Order matters**: format → lint → typecheck

## Prisma
- Config in `prisma.config.ts`; schema split across `prisma/schema/*.prisma`
- Generator outputs to `prisma/generated/prisma` (not node_modules)
- Import Prisma client via `@/prisma` (`prisma/index.ts`), which wraps `PrismaPg` adapter
- Uses PostgreSQL

## Stack & Versions
- Next.js 16, React 19, TypeScript 5.9
- Tailwind CSS v4 with `@tailwindcss/postcss`
- shadcn/ui v4, style `radix-nova`, icon library `lucide`
- NextAuth v5 beta (`next-auth@5.0.0-beta.30`) with JWT strategy + Prisma adapter
- No test runner configured (no jest/vitest/playwright)

## Style Conventions
- Prettier: no semicolons, double quotes, LF endings, 2-space indent, trailing commas `es5`
- ESLint override: `react-hooks/set-state-in-effect` is off

## Env Requirements
- `DATABASE_URL` (PostgreSQL)
- `AUTH_SECRET`
- Optional OAuth: `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`
- Optional AI: `DEEPSEEK_API_KEY`
- Optional Cloudinary: `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`
- Optional Pusher: `PUSHER_APP_ID/KEY/SECRET/CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY/CLUSTER`
- See `.env.example` for full list

## Key Paths
- `app/` — Next.js App Router
- `prisma/` — schema, migrations, generated client
- `lib/` — utilities, auth config, AI helpers, validations
- `components/` — shadcn/ui components + custom components
- `hooks/` — custom React hooks

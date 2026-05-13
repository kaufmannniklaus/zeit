# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Production build
npm run start      # Run production server

npx prisma migrate dev --name <name>   # Create and apply migration
npx prisma studio                      # Open DB GUI
npx prisma generate                    # Regenerate client after schema changes
npx shadcn@latest add <component>      # Add shadcn/ui component
```

## Architecture

**Single-user time tracking app** (Swiss labour law). Self-hosted via Docker on own server. No multi-tenancy, no Supabase — uses PostgreSQL directly via Prisma.

### Critical framework quirks

- **Next.js 16**: Auth middleware lives in `src/proxy.ts` (not `middleware.ts`), export function is named `proxy` (not `middleware`)
- **Prisma 7**: No `url` in `datasource` block in schema. DB connection via `@prisma/adapter-pg` adapter in `src/lib/prisma.ts`. CLI needs `prisma.config.ts` which loads `.env.local` via dotenv
- **OCR route** (`/api/ocr`): Must run in Node.js runtime (not Edge) — Tesseract.js requires it

### Auth flow

iron-session cookie (`zeit-session`, 30 days). `src/proxy.ts` guards all routes except `/login`, `/api/auth/*`, and `/api/push/check`. Login compares bcrypt hash from env var.

### Data models

| Model | Purpose |
|---|---|
| `Zeiteintrag` | Time entries (date, start/end time, break, effective minutes) |
| `Absenz` | Absences (FERIEN, KRANK, FEIERTAG, SONSTIGES) |
| `Einstellung` | Singleton settings (target hours/week, overtime balance) |
| `TagessitzungDraft` | Live day tracker state (start, pauses, ARV notification schedule) |
| `PushSubscription` | Web Push subscriptions (endpoint, p256dh, auth) |

### Business logic

- **`src/lib/kpi-berechnung.ts`**: KPI calculations including CZV-1 Swiss law (26-week rolling average, max 48h/week)
- **`src/lib/arv-berechnung.ts`**: Swiss ArG Art. 15 break rules — 15 min @6h, 30 min @9h, 45 min >9h. Generates push notification schedule
- **`src/lib/push-service.ts`**: Web Push via VAPID. Notifications sent by a Docker cron container that POSTs to `/api/push/check` every 60 seconds

### Deployment

Docker Compose runs two containers: `app` (Next.js on port 3001) and `cron` (curl loop for push notifications). The DB is external at `db.geld-herr.com`. The app joins the external `npm-n8n_default` network for reverse proxy access.

### Required env vars (`.env.local`)

```
DATABASE_URL=postgresql://...
SESSION_SECRET=<32+ chars>
APP_USERNAME=<username>
APP_PASSWORD_HASH=<bcrypt hash>
VAPID_PUBLIC_KEY=<key>
VAPID_PRIVATE_KEY=<key>
```

Generate bcrypt hash: `node -e "require('bcryptjs').hash('PASS',10).then(console.log)"`

> **Docker `env_file` quirk**: `$`-signs in the bcrypt hash must be escaped as `$$`.
> Example: `$2b$10$abc...` → `$$2b$$10$$abc...` in `.env.local`.
> Docker interpolates unescaped `$` as shell variables, truncating the hash.

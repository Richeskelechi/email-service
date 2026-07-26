# my-email

Local-first **multi-tenant email delivery** platform (TypeScript + Postgres).

See [EMAIL-PLATFORM-GUIDE.md](./EMAIL-PLATFORM-GUIDE.md) for architecture and phases.

## Do you need Docker?

**No** for this local setup:

| Service | How we run it |
|---------|----------------|
| PostgreSQL | Your existing Homebrew install |
| Mailpit (fake SMTP inbox) | Homebrew binary |
| Redis | Not required yet (Postgres outbox worker) |

Docker is optional later if you prefer compose for teammates.

## Prerequisites

1. **Postgres running** (you already have it installed):

```bash
pg_ctl -D /usr/local/var/postgresql@14 start
# or: brew services start postgresql@14
```

2. **Database** (created as `my_email` if you followed setup):

```bash
createdb my_email   # only if missing
```

3. **Mailpit** (catches mail locally — UI at http://127.0.0.1:8025):

```bash
brew install mailpit
mailpit
```

## Setup

```bash
cp .env.example .env
npm install
npx prisma migrate dev
```

### Mail by environment (`NODE_ENV`)

| `NODE_ENV` | Transport | Config |
|------------|-----------|--------|
| `local` (default) | Mailpit | `127.0.0.1:1025` |
| `staging` | Resend **HTTPS API** | `RESEND_API_KEY` required (SMTP blocked on Render free tier) |
| `production` | Your SMTP/MTA | `SMTP_HOST` required; optional `SMTP_USER` / `SMTP_PASS` / `SMTP_STARTTLS` |

On boot the API logs: `[mail] NODE_ENV=local → mailpit 127.0.0.1:1025 …`

## Run

By default the API also drains the outbox (`WORKER_EMBEDDED=true`). One terminal is enough:

```bash
npm run dev
```

To run the worker as a separate process later (scale-out):

```bash
# .env → WORKER_EMBEDDED=false
npm run dev          # API only
npm run dev:worker   # outbox worker
```

Swagger UI: http://127.0.0.1:3000/docs

## Create an organization (user + Super Admin + API keys)

Creates org, first user (no password yet), **Super Admin** role (all permissions), and test/live API keys. Secrets are shown **once**. A **set-password** email is sent via SMTP (Mailpit locally).

```bash
curl -s -X POST http://127.0.0.1:3070/v1/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme",
    "user": {
      "name": "Ada Lovelace",
      "email": "ada@acme.com",
      "phone": "+2348012345678",
      "address": "12 Marina, Lagos"
    }
  }'
```

### Set password & login

Open the invite in Mailpit (http://127.0.0.1:8025), copy the token from the link, then:

```bash
curl -s -X POST http://127.0.0.1:3070/v1/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_FROM_EMAIL","password":"your-secure-password"}'

curl -s -X POST http://127.0.0.1:3070/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@acme.com","password":"your-secure-password"}'
```

Session token from login is used as `Authorization: Bearer <accessToken>` for users/roles (Swagger security scheme: **session**).

### Users & roles (session auth + permissions)

| Method | Path | Permission |
|--------|------|------------|
| `POST` | `/v1/users` | `users:create` — invite (+ set-password email) |
| `GET` | `/v1/users` | `users:read` — paginated (`page`, `limit`, `search`, `roleId`) |
| `GET` | `/v1/users/:id` | `users:read` |
| `PATCH` | `/v1/users/:id` | `users:update` |
| `DELETE` | `/v1/users/:id` | `users:delete` |
| `POST` | `/v1/users/:id/resend-invite` | `users:create` |
| `POST` | `/v1/roles` | `roles:create` |
| `GET` | `/v1/roles` | `roles:read` — paginated (`search`, `isSuperAdmin`) |
| `GET` | `/v1/roles/:id` | `roles:read` |
| `PATCH` | `/v1/roles/:id` | `roles:update` |
| `DELETE` | `/v1/roles/:id` | `roles:delete` |
| `POST` | `/v1/auth/forgot-password` | public |
| `GET` | `/v1/auth/me` | session |
| `POST` | `/v1/auth/logout` | session |

List responses use `{ items, meta: { page, limit, total, totalPages } }` inside the standard envelope.

Permissions are seeded on app startup from `src/permissions/permissions.catalog.ts` (adds any missing keys).

| Key | Behavior |
|-----|----------|
| `me_test_…` | Worker **simulates** + logs — no SMTP |
| `me_live_…` | Worker **sends** via SMTP (Mailpit locally) |

### Single send

`POST /v1/email/send` — **requires** an org `templateId` (+ optional `variables`).

```bash
curl -s -X POST http://127.0.0.1:3070/v1/email/send \
  -H "Authorization: Bearer me_test_YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "YOUR_TEMPLATE_ID",
    "to": "you@example.com",
    "variables": { "name": "Ada", "organizationName": "Acme" }
  }'
```

### Bulk send

`POST /v1/email/bulk` — same template requirement; per-recipient `variables` merge over batch variables. Max `BULK_MAX_RECIPIENTS`. Org rate limit: `ORG_RATE_LIMIT_PER_MINUTE`.

```bash
curl -s -X POST http://127.0.0.1:3070/v1/email/bulk \
  -H "Authorization: Bearer me_test_YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "YOUR_TEMPLATE_ID",
    "variables": { "organizationName": "Acme" },
    "recipients": [
      { "to": "a@example.com", "variables": { "name": "Ada" } },
      { "to": "b@example.com", "variables": { "name": "Grace" } }
    ]
  }'
```

- Status: `GET /v1/email/bulk/:batchId`
- Messages (paginated): `GET /v1/email/bulk/:batchId/messages?page=1&limit=50`

System templates (`auth.set_password`, `auth.reset_password`) are seeded on boot for invite/reset emails — not usable via the send API (org templates only).

Worker uses `FOR UPDATE SKIP LOCKED` (safe multi-worker) + fan-out chunks + concurrent delivery.

`DEV_API_KEY` in `.env` still works for quick local live sends and bootstraps a local org with both key types.

## What this is (and is not)

- **Is:** accept → store in Postgres → worker simulates (test) or SMTP-sends (live)
- **Is not:** real delivery to Gmail/Outlook (that needs Phase 0 domain/VPS + real MTA)

## Stack

- Node.js + TypeScript + NestJS
- PostgreSQL + Prisma
- Own SMTP client → Mailpit (local) / your MTA (later)
- Outbox worker (no Redis yet)

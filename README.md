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

## Run (two terminals)

```bash
# Terminal 1 — API
npm run dev

# Terminal 2 — outbox worker (SMTP → Mailpit)
npm run dev:worker
```

Swagger UI: http://127.0.0.1:3000/docs

## Create an organization (test + live keys)

Each org gets **two** API keys at creation. Secrets are shown **once**.

```bash
curl -s -X POST http://127.0.0.1:3000/v1/organizations \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme"}'
```

| Key | Behavior |
|-----|----------|
| `me_test_…` | Worker **simulates** + logs — no SMTP |
| `me_live_…` | Worker **sends** via SMTP (Mailpit locally) |

### Single send

`POST /v1/email/send`

### Bulk send

`POST /v1/email/bulk` — accepts quickly (async fan-out), max `BULK_MAX_RECIPIENTS` (default 1000). Org rate limit: `ORG_RATE_LIMIT_PER_MINUTE`.

```bash
curl -s -X POST http://127.0.0.1:3070/v1/email/bulk \
  -H "Authorization: Bearer me_test_YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Hello",
    "text": "Bulk message",
    "recipients": [
      { "to": "a@example.com" },
      { "to": "b@example.com" }
    ]
  }'
```

- Status: `GET /v1/email/bulk/:batchId`
- Messages (paginated): `GET /v1/email/bulk/:batchId/messages?page=1&limit=50`

Worker uses `FOR UPDATE SKIP LOCKED` (safe multi-worker) + fan-out chunks + concurrent delivery.
```bash
# Test — simulate only (watch worker logs)
curl -s -X POST http://127.0.0.1:3000/v1/email/send \
  -H "Authorization: Bearer me_test_YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"to":"you@example.com","subject":"Test","text":"Simulated only"}'

# Live — real SMTP to Mailpit
curl -s -X POST http://127.0.0.1:3000/v1/email/send \
  -H "Authorization: Bearer me_live_YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"to":"you@example.com","subject":"Live","text":"Goes to Mailpit"}'
```

`DEV_API_KEY` in `.env` still works for quick local live sends and bootstraps a local org with both key types.

## What this is (and is not)

- **Is:** accept → store in Postgres → worker simulates (test) or SMTP-sends (live)
- **Is not:** real delivery to Gmail/Outlook (that needs Phase 0 domain/VPS + real MTA)

## Stack

- Node.js + TypeScript + NestJS
- PostgreSQL + Prisma
- Own SMTP client → Mailpit (local) / your MTA (later)
- Outbox worker (no Redis yet)

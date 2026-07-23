# Email Delivery Platform — Knowledge & Architecture Guide

Reference doc for building a **multi-tenant outbound email service** (ESP-style): subscribers send through your API; recipients see **their** From address; **your** infrastructure delivers the mail.

Stack intent: **Node.js**  
Status: planning / learning (no implementation required to use this doc)

---

## What you are building

An outbound email platform (smaller SendGrid / Mailgun), **not** a full Gmail clone.

```text
Subscriber's app/website
        │
        │  HTTPS API (Node)
        ▼
Your control plane
  • accounts, API keys, billing
  • sender / domain verification
  • templates, logs, webhooks
        │
        ▼
Your sending pipeline
  • queue, rate limits, retries
  • compose MIME message
  • sign with DKIM
        │
        ▼
Your SMTP / MTA layer
        │
        ▼
Internet mail servers (Gmail, Outlook, …)
```

| Role | Who owns it |
|------|-------------|
| Product surface (API + dashboard) | You |
| Visible From / brand identity | Customer (after verification) |
| Actual SMTP delivery, IP reputation, bounce handling, abuse controls | You |

**Out of scope for v1:** inboxes, IMAP, “receive mail for users” (can come later).

---

## Core concepts

### 1. Email is not HTTP

- **SMTP** moves mail between servers (port 25 between MTAs; 587 for authenticated submission).
- Messages are **MIME**: headers + body (text/HTML) + attachments.
- Delivery is **best-effort + retries**, not an instant REST guarantee.
- Your API returns **accepted**; real outcomes arrive later: delivered / bounced / deferred / complained.

### 2. Envelope vs headers (“their sender ID”)

| Layer | Meaning | Typical owner |
|-------|---------|---------------|
| Envelope `MAIL FROM` (Return-Path) | Who receives bounces | Often **you**, e.g. `bounce+id@mail.yourplatform.com` |
| Header `From:` | What humans see | **Customer**, e.g. `Acme <hello@acme.com>` |
| Header `Reply-To:` | Where replies go | Often the customer’s address |

Visible sender = customer. Bounce plumbing & reputation = you. That is standard ESP design.

### 3. Proof of ownership before sending as them

Without verification, anyone could spoof `From: ceo@google.com`.

Customers must **verify domains** (preferred) or single addresses:

- DNS TXT or CNAME you provide, **or**
- Confirmation link for single-address senders

Until verified: reject or tightly restrict sending.

### 4. SPF, DKIM, DMARC

| Mechanism | Purpose |
|-----------|---------|
| **SPF** | Which IPs may send for a domain |
| **DKIM** | Cryptographic signature on the message; public key in DNS |
| **DMARC** | Policy when SPF/DKIM fail; **alignment** with visible `From` domain |

**Alignment** is the key idea: receivers check that SPF and/or DKIM domain aligns with the `From` domain. That is how “shows as their email” stays legitimate.

### 5. Your domain vs their domain

Typical pattern:

- You own `yourplatform.com` and `mail.yourplatform.com`
- Customer owns `acme.com`
- Customer points DNS at you for sending auth (SPF include / DKIM CNAMEs)
- Bounces/complaints hit **your** infrastructure, tracked per message/customer

### 6. Deliverability ≠ “SMTP accepted”

Remote acceptance ≠ inbox placement. Learn:

- IP reputation (new IPs are cold — **warm-up**)
- Domain reputation
- Content / spam signals
- Engagement and complaint rates (privacy-aware)
- Blocklists, greylisting, deferrals
- **Hard bounce** (invalid) vs **soft bounce** (temporary)
- Complaint / feedback loops (“spam” button)

Bad tenants destroy **shared** reputation. Multi-tenant email is an **abuse + trust** business as much as a tech one.

---

## Multi-tenant product model

Each customer roughly gets:

1. **Account** — org, plan, limits  
2. **API keys** — authenticate send requests  
3. **Verified senders/domains** — who they may appear as  
4. **Quotas / rate limits** — per second, per day  
5. **Message logs** — accepted → queued → sent → delivered / bounced / complained  
6. **Webhooks** — push events to their backend  
7. **Suppression list** — never mail addresses that hard-bounced or complained  

Node app = **control plane**. Mail engines = **data plane**.

---

## Architecture inventory

### Control plane (Node.js)

- Auth (users, orgs, API keys — store hashes, not raw secrets)
- Domain verification flows
- Send API (`POST /v1/email/send`)
- Templates (optional)
- Billing / plans
- Admin kill-switch for abusive accounts
- Audit logs

### Data plane

- **Queue** (Redis/BullMQ, RabbitMQ, SQS, …) — never send synchronously inside the HTTP request
- **Workers** — pull jobs, talk SMTP, retry with backoff
- **MTA** — Postfix / Haraka / Postal / similar (or Node SMTP client to your relay)
- **Tracking** (optional) — opens/clicks; disclose; privacy laws apply
- **Inbound for bounces** — parse DSN bounces or MTA events

### Storage

- Postgres — accounts, domains, message metadata
- Object storage optional — raw MIME if retention requires it
- Explicit retention policy — do not keep forever by default

---

## Security checklist

### Account & API

- [ ] API keys shown once; stored hashed
- [ ] Scoped keys (send-only vs admin)
- [ ] TLS everywhere (API + SMTP submission)
- [ ] Rate limits + anomaly detection (sudden volume spikes)
- [ ] Optional IP allowlists for enterprise

### Abuse & fraud

- [ ] Domain/email verified before send
- [ ] Caps for new accounts (trial limits, warm-up)
- [ ] Spam / phishing heuristics on content & links
- [ ] Block disposable signup abuse
- [ ] Per-tenant kill switch
- [ ] Stronger identity checks for higher volume
- [ ] Auto-suspend on high complaint rate (industry often aims **≪ 0.1%**)

### Email-specific attacks

- [ ] No open relay — never unauthenticated arbitrary sending
- [ ] Sanitize headers (subject, addresses) — prevent injection
- [ ] Only verified `From` domains
- [ ] Protect against account takeover → mass phishing from your IPs
- [ ] If using link tracking: no open-redirect abuse

### Data protection

- [ ] Encrypt secrets at rest (especially **per-domain DKIM private keys**)
- [ ] Least privilege on workers
- [ ] Careful handling of bounce/complaint PII
- [ ] GDPR/CCPA-style retention, deletion, DPA with customers
- [ ] Avoid logging full bodies in plaintext forever

### Infrastructure

- [ ] Shared pool first; dedicated sending IPs later
- [ ] Separate pools for transactional vs marketing (if you allow marketing)
- [ ] PTR / rDNS on sending IPs
- [ ] Firewall: only required ports; MTA not writable without auth
- [ ] Secrets not in git
- [ ] Backups + incident playbook (“we’re on a blocklist”)

---

## Compliance (product rules)

- **Transactional** (receipts, password resets) vs **marketing** (newsletters) — different legal and reputation rules
- Consent, unsubscribe, CAN-SPAM / CASL / GDPR as applicable
- `List-Unsubscribe` / one-click unsubscribe for bulk
- You are often a **processor**; customer is **controller** of recipient lists
- ToS + enforcement: no phishing, no stolen lists, no malware links

---

## Node.js learning order

1. HTTP APIs — Express/Fastify, auth middleware, validation (e.g. Zod)
2. Background jobs — queues, idempotency, retries, dead-letter queues
3. SMTP — build MIME + speak SMTP yourself (or submit to your MTA); know what that does **not** solve (reputation, multi-tenant DKIM ops, bounce pipeline)
4. MIME & headers — From, Reply-To, Message-ID, List-Unsubscribe
5. Crypto basics — API key hashing, DKIM concepts, TLS
6. DNS checks — TXT/CNAME verification in code
7. Webhooks — HMAC-signed payloads, retry delivery to customer URLs
8. Observability — per-tenant accept / bounce / deferral / latency metrics

**Practical pattern:** Node = API + queue + policy + identity/DKIM management. Real MTA = SMTP conversation with the world. Pure-Node sending is fine for learning/low volume.

---

## End-to-end flow (one message)

1. Acme signs up  
2. Acme adds domain `acme.com` → you show DNS records  
3. Your job checks DNS until verified  
4. You generate DKIM keys; Acme publishes CNAME/TXT  
5. Acme calls API with API key: to, from, subject, html  
6. You validate: key OK, `from` domain verified, under quota, not suppressed  
7. You enqueue; API returns `message_id`  
8. Worker builds MIME, sets Return-Path to your bounce address, signs DKIM for Acme  
9. MTA delivers to recipient provider  
10. Delivery / bounce / complaint → update log → webhook to Acme  

---

## Difficulty map

| Layer | Difficulty |
|-------|------------|
| Send API + dashboard + DB | Medium |
| Domain verify + DKIM per tenant | Medium–hard |
| Queue + retries + logs + webhooks | Medium |
| High deliverability at scale | Hard (ops + reputation) |
| Abuse-resistant multi-tenant ESP | Very hard |

**Recommended v1:** verified-domain **transactional** sending, low volume, shared IP, strict limits. Marketing/blasts later.

---

# Local-first path (what we are doing now)

You can build the **codebase on your laptop** before buying a domain/VPS.

| Need | Local choice | Docker required? |
|------|----------------|------------------|
| Database | Your existing Homebrew PostgreSQL | **No** |
| Fake inbox / SMTP | Mailpit (`brew install mailpit`) | **No** |
| Job queue (Phase 1) | Postgres outbox worker | **No** |
| Redis / BullMQ | Later, when volume needs it | Optional |
| Real Gmail delivery | Phase 0 lab (domain + VPS + MTA) | No |

**Order:** Local TypeScript app (accept → store → SMTP to Mailpit) → then Phase 0 for real internet mail.

Repo entrypoints: `README.md`, `src/index.ts` (API), `src/worker.ts` (outbox sender).

---

# Phased plan

## Phase 0 — Foundations (knowledge + lab)

**Goal:** Understand mail on the wire before writing a product.

### Know

- [ ] SMTP vs HTTP; ports 25 / 587 / 465 / 993 (993 only if you add receiving later)
- [ ] MX, A/AAAA, PTR/rDNS
- [ ] SPF, DKIM, DMARC at a conceptual level
- [ ] Envelope vs `From` header
- [ ] Why cloud hosts often block port 25

### Do

- [ ] Buy a domain for the **platform** (e.g. `yourplatform.com`)
- [ ] Get a VPS that allows outbound mail (or request port 25 unblock)
- [ ] Set PTR/rDNS on the sending IP with the provider
- [ ] Send a test message with a simple tool (swaks, or your SMTP client → local Postfix/Mailpit)
- [ ] Inspect headers of a received message (Authentication-Results, DKIM-Signature)

### Exit criteria

You can explain what SPF/DKIM/DMARC do and read auth results on a real message.

---

## Phase 1 — Single-tenant send (your domain only)

**Goal:** Your Node app can accept a send request and deliver mail **from your own domain**.

### Know

- [ ] MIME structure (text + HTML multipart)
- [ ] Message-ID, Date, From, To, Subject
- [ ] Queue-first design (HTTP accept ≠ SMTP done)
- [ ] Soft vs hard bounce (even if handling is manual at first)

### Build

- [ ] Node API: `POST /v1/email/send` (auth can be a single admin key)
- [ ] Validate input (emails, size limits)
- [ ] Push job to queue (BullMQ + Redis is a common Node choice)
- [ ] Worker sends via your SMTP client → your MTA (Postfix) or a relay you control
- [ ] Platform DNS: SPF, DKIM, DMARC for `mail.yourplatform.com` / `yourplatform.com`
- [ ] Store message status: `accepted` → `sent` → (later) terminal states
- [ ] Basic structured logging

### Security in this phase

- [ ] TLS on API
- [ ] No open relay
- [ ] Secret/API key not in repo
- [ ] Rate limit even for yourself

### Exit criteria

You can send transactional mail from **your** domain to Gmail/Outlook with passing SPF/DKIM and reasonable inbox placement on a warm-enough IP.

---

## Phase 2 — Multi-tenant identity (their From address)

**Goal:** Customers send **as their domain** through your infra.

### Know

- [ ] Domain verification (DNS TXT/CNAME challenges)
- [ ] Per-tenant DKIM keypairs
- [ ] DMARC alignment when From is `customer.com` but you send
- [ ] Custom Return-Path / bounce subdomain strategy
- [ ] CNAME-based DKIM delegation (customer points to you)

### Build

- [ ] Orgs / accounts model
- [ ] API keys per org (hashed at rest)
- [ ] `domains` table: pending → verified
- [ ] DNS verification worker (poll TXT/CNAME)
- [ ] Generate & store DKIM keys per domain (encrypt private keys)
- [ ] Send path: reject if `From` domain not verified for that org
- [ ] Sign outbound mail with that domain’s DKIM
- [ ] Document exact DNS records customers must add
- [ ] Dashboard or CLI docs for “add domain”

### Security in this phase

- [ ] Only verified From domains
- [ ] Tenant isolation (org A cannot use org B’s domain)
- [ ] DKIM private keys encrypted; restricted access
- [ ] Per-org quotas

### Exit criteria

A second party can verify `acme.com`, call your API, and recipients see `From: hello@acme.com` with aligned DKIM/SPF/DMARC.

---

## Phase 3 — Reliability, feedback, abuse, billing

**Goal:** Operate like a real ESP at small scale.

### Know

- [ ] Idempotency keys on send
- [ ] Webhook signing (HMAC) and customer-side verification
- [ ] Suppression lists
- [ ] IP warm-up schedules
- [ ] Gmail Postmaster Tools / Microsoft SNDS concepts
- [ ] Complaint rate thresholds and auto-suspend
- [ ] Transactional vs marketing policy

### Build

- [ ] Bounce ingestion + classify hard/soft
- [ ] Complaint handling → suppress
- [ ] Event webhooks: `delivered`, `bounced`, `complained`, `deferred` (as available)
- [ ] Per-tenant metrics dashboard
- [ ] Dead-letter queue for poison messages
- [ ] Retry/backoff policy documented
- [ ] Plan limits + billing hooks (even if manual invoices first)
- [ ] Admin suspend / unsuspend
- [ ] Abuse reporting path + ToS enforcement runbook
- [ ] Data retention + delete-org flow

### Security in this phase

- [ ] Anomaly detection on volume
- [ ] Auto-suspend on bounce/complaint spikes
- [ ] Webhook SSRF protections (block metadata IPs, private ranges)
- [ ] Audit log of admin and key actions

### Exit criteria

You can onboard a real customer, deliver mail, report outcomes via webhooks, and shut down abuse without killing the whole platform.

---

## Phase 4 — Scale & harden (later)

Only after Phases 0–3 are solid:

- Dedicated IPs / IP pools
- Separate transactional vs marketing pools
- Multiple regions / MX-less outbound farms
- Advanced deliverability tooling
- Optional inbound parse / receiving
- Optional marketing features (lists, campaigns) with strict compliance
- Formal SOC2-style controls if enterprise buyers demand them

---

## Suggested v1 tech sketch (when coding starts)

| Concern | Sensible default |
|---------|------------------|
| API | Node + NestJS (scaffolded in this repo) |
| Validation | Zod |
| DB | PostgreSQL + Prisma (local Homebrew Postgres is enough — Docker optional) |
| Queue | Postgres outbox worker first; Redis + BullMQ later |
| Mail compose/send | Own SMTP client → Mailpit (local) → Postfix (real) |
| Auth | DEV_API_KEY locally; hashed API keys in DB next |
| Secrets | `.env` locally; vault/KMS later for DKIM keys |
| Hosting | Laptop → single VPS → split API/workers/MTA |

This is a sketch, not a lock-in. Prefer boring, operable pieces.

---

## Study references (bookmark)

- RFC 5321 (SMTP), RFC 5322 (message format)
- SPF (RFC 7208), DKIM (RFC 6376), DMARC (RFC 7489)
- Gmail / Yahoo sender requirements (2024+) — SPF/DKIM/DMARC, one-click unsubscribe for bulk
- Provider postmaster tools (Gmail Postmaster, Microsoft SNDS)
- Your VPS provider docs on PTR and port 25

---

## One-line reminder

You are building a **multi-tenant email delivery service**: customers auth to you, prove domain ownership, then your infrastructure sends mail that **displays as them**, while **bounces, reputation, and security** stay on your plate.

Start Phase 0. Do not skip DNS/auth labs before multi-tenant features.

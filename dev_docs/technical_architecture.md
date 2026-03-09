# FlareLens (Budget Guard) — Technical Architecture

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Data Flow](#2-data-flow)
3. [API Design](#3-api-design)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Cloudflare Integration](#5-cloudflare-integration)
6. [Anomaly Detection](#6-anomaly-detection)
7. [Alert Pipeline](#7-alert-pipeline)
8. [Multi-tenancy](#8-multi-tenancy)
9. [D1 Database Schema](#9-d1-database-schema)
10. [Cron Job Design](#10-cron-job-design)
11. [Security](#11-security)
12. [Plan Tier Limits](#12-plan-tier-limits)
13. [Deployment](#13-deployment)
14. [Scaling & Error Handling](#14-scaling--error-handling)

---

## 1. System Overview

### High-Level Architecture

```
                          ┌─────────────────────────────────────┐
                          │          Cloudflare Edge            │
                          │                                     │
  ┌──────────┐            │  ┌──────────────────────────────┐   │
  │ Browser  │◄──────────►│  │     SvelteKit Frontend       │   │
  │ (User)   │    HTTPS   │  │     (Cloudflare Workers)      │   │
  └──────────┘            │  └──────────┬───────────────────┘   │
                          │             │ fetch()               │
                          │             ▼                       │
                          │  ┌──────────────────────────────┐   │
                          │  │    Hono API Worker            │   │
                          │  │    (Workers Runtime)          │   │
                          │  └──┬───┬───┬───┬───┬───┬──────┘   │
                          │     │   │   │   │   │   │          │
                          │     ▼   ▼   ▼   ▼   ▼   ▼          │
                          │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌────┐  │
                          │  │D1│ │KV│ │R2│ │AE│ │Q │ │DO  │  │
                          │  └──┘ └──┘ └──┘ └──┘ └──┘ └────┘  │
                          │                                     │
                          │  ┌──────────────────────────────┐   │
                          │  │     Cron Trigger Workers      │   │
                          │  │  (Polling / Baseline / Digest)│   │
                          │  └──────────────────────────────┘   │
                          └─────────────────────────────────────┘
                                           │
                                           │ HTTPS
                                           ▼
                          ┌─────────────────────────────────────┐
                          │     External Services               │
                          │  ┌────────┐ ┌───────┐ ┌──────────┐ │
                          │  │CF API  │ │Resend │ │Slack/    │ │
                          │  │GraphQL │ │(email)│ │Discord   │ │
                          │  └────────┘ └───────┘ └──────────┘ │
                          └─────────────────────────────────────┘

Legend:
  D1  = D1 SQLite Database (relational data)
  KV  = Workers KV (sessions, cache, config)
  R2  = R2 Object Storage (reports, exports, snapshots)
  AE  = Analytics Engine (time-series metrics)
  Q   = Queues (async alert dispatch)
  DO  = Durable Objects (real-time connections, rate limits)
```

### Component Responsibilities

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| **Frontend** | SvelteKit on Cloudflare Workers (`@sveltejs/adapter-cloudflare`) | SSR/SSG landing pages, SPA dashboard, client-side routing |
| **API Layer** | Hono on Cloudflare Workers | RESTful API, auth middleware, request validation, CF API proxy |
| **Primary Database** | Cloudflare D1 (SQLite) | Users, accounts, teams, rules, anomalies, audit logs, tokens |
| **Session & Cache** | Workers KV | Session tokens, CF API response cache, feature flags, rate-limit counters |
| **Object Storage** | R2 | CSV/PDF report exports, zone snapshots, invoice archives |
| **Time-Series Metrics** | Analytics Engine | High-volume metric ingestion for traffic data, cost tracking, baseline computation |
| **Task Queue** | Cloudflare Queues | Async alert dispatch (email, Slack, Discord, webhooks), CF API batch operations |
| **Scheduled Jobs** | Cron Triggers | Metrics polling, baseline recalculation, daily digests, resource sync, housekeeping |
| **Real-time & Rate Limits** | Durable Objects | WebSocket connections for live dashboard, per-account rate limiting, distributed locks |

---

## 2. Data Flow

### Flow 1: Scheduled Metrics Polling

```
Cron Trigger (every 5 min)
  │
  ▼
Poll Worker activates
  │
  ├─► Read active accounts from D1
  │     (SELECT accounts with active cf_tokens)
  │
  ├─► For each account:
  │     ├─► Decrypt CF API token from D1
  │     ├─► Query CF GraphQL Analytics API
  │     │     - httpRequests1mGroups (zone traffic)
  │     │     - workersInvocationsAdaptive (worker metrics)
  │     │     - r2OperationsAdaptive (storage ops)
  │     │     - kvOperationsAdaptive (KV ops)
  │     ├─► Write raw metrics to Analytics Engine
  │     ├─► Update zone_snapshots in D1 (latest summary)
  │     └─► Enqueue anomaly-check message to Queue
  │
  └─► Log poll completion + duration
```

### Flow 2: Anomaly Detection

```
Queue consumer receives anomaly-check message
  │
  ▼
Anomaly Detection Worker
  │
  ├─► Fetch current metric snapshot (from Analytics Engine)
  ├─► Fetch baseline for resource (from D1 baselines table)
  │
  ├─► Layer 1: Static Threshold Check
  │     Compare against user-defined rules (D1 rules table)
  │     e.g., "requests > 10,000/min" or "cost > $5/hr"
  │
  ├─► Layer 2: Baseline Deviation Check
  │     Compare current value vs. 7-day rolling average
  │     Flag if deviation exceeds configured sensitivity
  │     (e.g., 2x stddev for warning, 3x for critical)
  │
  ├─► Layer 3: Velocity Detection
  │     Calculate rate-of-change over last 3 data points
  │     Flag if acceleration exceeds threshold
  │
  ├─► If anomaly detected:
  │     ├─► Run attribution analysis
  │     │     - Top endpoints, user-agents, countries, ASNs
  │     ├─► Insert anomaly record into D1
  │     ├─► Enqueue alert-dispatch message to Queue
  │     └─► If mitigation rule active → enqueue mitigation action
  │
  └─► Update anomaly_state in KV (deduplication window)
```

### Flow 3: Alert Dispatch

```
Queue consumer receives alert-dispatch message
  │
  ▼
Alert Dispatch Worker
  │
  ├─► Read anomaly details from D1
  ├─► Check deduplication (KV: alert:{account}:{rule}:{hash})
  │     Skip if duplicate within cooldown window
  │
  ├─► Load account notification preferences (D1)
  ├─► Load integration configs (D1 + KV cache)
  │
  ├─► Dispatch to each enabled channel:
  │     ├─► Email (Resend API)
  │     │     - Render HTML template with anomaly context
  │     ├─► Slack (Incoming Webhook)
  │     │     - Format Block Kit message
  │     ├─► Discord (Webhook URL)
  │     │     - Format embed message
  │     ├─► PagerDuty (Events API v2)
  │     │     - Create incident for critical severity
  │     ├─► Custom Webhooks
  │     │     - POST JSON payload to user-defined URLs
  │     └─► In-app notification
  │           - Insert into notifications table (D1)
  │           - Push via Durable Object WebSocket
  │
  ├─► Record delivery status in D1 (alert_deliveries)
  └─► Update alert dedup key in KV with TTL
```

### Flow 4: Real-time Dashboard Push

```
User opens Dashboard
  │
  ▼
SvelteKit client establishes WebSocket
  │
  ├─► Connect to Durable Object (per-account singleton)
  │     GET /api/ws → upgrade to WebSocket
  │     DO: AccountLiveFeed#{account_id}
  │
  ├─► DO maintains list of active connections per account
  │
  ▼
When new metrics arrive (from Poll Worker):
  │
  ├─► Poll Worker sends message to DO
  │     DO.fetch("/push", { metrics, anomalies })
  │
  ├─► DO broadcasts to all connected WebSocket clients:
  │     {
  │       type: "metrics_update",
  │       data: { requests, cost, baseline, anomalies }
  │     }
  │
  └─► Client SvelteKit store updates reactively
        Dashboard charts + cards re-render
```

### Flow 5: User Actions

```
User performs action (e.g., Create Rule)
  │
  ▼
SvelteKit form/action → API request
  │
  ├─► Hono middleware pipeline:
  │     ├─► CORS check
  │     ├─► Rate limit check (KV counter)
  │     ├─► Session validation (KV lookup)
  │     ├─► RBAC permission check
  │     └─► Zod input validation
  │
  ├─► Route handler executes:
  │     ├─► Business logic
  │     ├─► D1 write (INSERT/UPDATE)
  │     ├─► Invalidate relevant KV cache
  │     └─► Write audit log entry (D1 audit_logs)
  │
  └─► Return JSON response → SvelteKit renders update
```

---

## 3. API Design

Base URL: `https://api.flarelens.com/v1`

All routes require authentication unless marked `[public]`.

### Auth

| Method | Path | Description | Screen |
|--------|------|-------------|--------|
| POST | `/auth/register` | Create account (email/password or OAuth) | Sign-up page |
| POST | `/auth/login` | Email/password login | Log-in page |
| POST | `/auth/logout` | Destroy session | — |
| GET | `/auth/oauth/:provider` | Initiate OAuth (google/github) | Log-in page |
| GET | `/auth/oauth/:provider/callback` | OAuth callback | — |
| POST | `/auth/forgot-password` | Send password reset email | Forgot password |
| POST | `/auth/reset-password` | Reset password with token | Forgot password |
| GET | `/auth/me` | Current user profile | Settings |

### Zones & Resources

| Method | Path | Description | Screen |
|--------|------|-------------|--------|
| GET | `/resources` | List all monitored resources | Infrastructure Inventory |
| POST | `/resources` | Add resource manually | Inventory → Add Resource |
| GET | `/resources/:id` | Resource details | — |
| PATCH | `/resources/:id` | Update monitoring status (pause/resume) | Inventory actions |
| DELETE | `/resources/:id` | Remove resource | Inventory actions |
| POST | `/resources/sync` | Trigger resource sync from CF | Inventory |

### Analytics & Metrics

| Method | Path | Description | Screen |
|--------|------|-------------|--------|
| GET | `/analytics/overview` | Dashboard summary (requests, cost, workers) | Dashboard Overview |
| GET | `/analytics/traffic` | Traffic time-series (cached/uncached, by type) | Analytics → Traffic |
| GET | `/analytics/performance` | Latency, response times, slowest routes | Analytics → Performance |
| GET | `/analytics/cost` | Cost breakdown by service | Analytics → Cost / Billing Overview |
| GET | `/analytics/errors` | Error rates and distribution | Analytics → Errors |
| GET | `/analytics/top-endpoints` | Top 5 endpoints by requests | Analytics → Traffic |
| GET | `/analytics/geo` | Traffic by country | Analytics → Traffic |
| GET | `/analytics/clients` | Client/user-agent distribution | Analytics → Traffic |
| GET | `/analytics/baseline` | Baseline vs. actual comparison data | Dashboard → Traffic vs. Baseline |
| GET | `/analytics/bot-activity` | Bot detection summary | Dashboard → Bot Activity |

Query parameters (common): `?zone_id=&from=&to=&interval=5m|1h|1d`

### Rules & Limits

| Method | Path | Description | Screen |
|--------|------|-------------|--------|
| GET | `/rules` | List all monitoring rules | Rules & Limits |
| POST | `/rules` | Create new rule | Rules → Create New Rule modal |
| GET | `/rules/:id` | Rule details | — |
| PATCH | `/rules/:id` | Update rule (name, condition, status) | Rules → Edit |
| DELETE | `/rules/:id` | Delete rule | Rules → actions menu |
| PATCH | `/rules/:id/toggle` | Enable/disable rule | Rules → toggle switch |

### Anomalies & Alerts

| Method | Path | Description | Screen |
|--------|------|-------------|--------|
| GET | `/anomalies` | List detected anomalies | Anomalies list |
| GET | `/anomalies/:id` | Anomaly detail with attribution | Anomaly detail |
| PATCH | `/anomalies/:id/dismiss` | Dismiss anomaly | Anomaly actions |
| GET | `/alerts` | List alert history | — |
| GET | `/notifications` | In-app notification inbox | Notification Inbox |
| PATCH | `/notifications/:id/read` | Mark notification read | Inbox → dismiss |
| POST | `/notifications/mark-all-read` | Mark all as read | Inbox → Mark all as read |
| POST | `/notifications/archive-all` | Archive all notifications | Inbox → Archive All |

### Mitigation (Guardian Mode)

| Method | Path | Description | Screen |
|--------|------|-------------|--------|
| GET | `/mitigations` | List mitigation rules | Automated Mitigation Rules |
| POST | `/mitigations` | Create mitigation rule | Add Mitigation |
| PATCH | `/mitigations/:id` | Update mitigation rule | Edit Rule |
| PATCH | `/mitigations/:id/toggle` | Enable/disable mitigation | Toggle switch |
| DELETE | `/mitigations/:id` | Delete mitigation | — |
| POST | `/mitigations/:id/trigger` | Manually trigger mitigation | — |

### Integrations

| Method | Path | Description | Screen |
|--------|------|-------------|--------|
| GET | `/integrations` | List all integrations + status | Integrations Management |
| POST | `/integrations/slack` | Configure Slack webhook | Integrations → Slack |
| POST | `/integrations/discord` | Configure Discord webhook | Integrations → Discord |
| POST | `/integrations/pagerduty` | Configure PagerDuty | Integrations → PagerDuty |
| POST | `/integrations/teams` | Configure MS Teams | Integrations → Teams |
| GET | `/integrations/webhooks` | List custom webhooks | Integrations → Custom Webhooks |
| POST | `/integrations/webhooks` | Add custom webhook | Integrations → Add Webhook |
| PATCH | `/integrations/webhooks/:id` | Update webhook | — |
| DELETE | `/integrations/webhooks/:id` | Delete webhook | — |
| POST | `/integrations/:type/test` | Send test notification | Integration configure |

### Team

| Method | Path | Description | Screen |
|--------|------|-------------|--------|
| GET | `/team/members` | List team members | Team Management |
| POST | `/team/invites` | Invite member by email | Team → Invite Member |
| PATCH | `/team/members/:id/role` | Change member role | Team → actions |
| DELETE | `/team/members/:id` | Remove member | Team → actions |
| POST | `/team/invites/:id/resend` | Resend invitation | Team → Resend |

### Settings & Profile

| Method | Path | Description | Screen |
|--------|------|-------------|--------|
| GET | `/settings/profile` | Get user profile | Settings → Profile |
| PATCH | `/settings/profile` | Update profile (name, email) | Settings → Profile |
| PATCH | `/settings/password` | Change password | Settings → Profile |
| GET | `/settings/notifications` | Notification preferences | Settings → Notifications |
| PATCH | `/settings/notifications` | Update notification prefs | Settings → Notifications |
| GET | `/settings/account` | Account-level settings | Settings |
| PATCH | `/settings/account` | Update account settings | Settings |

### Cloudflare Tokens

| Method | Path | Description | Screen |
|--------|------|-------------|--------|
| GET | `/cf-tokens` | List connected CF tokens (masked) | Settings / Onboarding |
| POST | `/cf-tokens` | Add CF API token | Onboarding |
| DELETE | `/cf-tokens/:id` | Revoke CF token | Settings |
| POST | `/cf-tokens/:id/verify` | Verify token permissions | Onboarding |

### Billing

| Method | Path | Description | Screen |
|--------|------|-------------|--------|
| GET | `/billing/overview` | Current spend, projected, daily avg | Billing Overview |
| GET | `/billing/breakdown` | Cost by service (Workers, CDN, etc.) | Billing → Usage Breakdown |
| GET | `/billing/invoices` | Invoice history | Billing → Recent Invoices |
| GET | `/billing/budget` | Budget threshold config | Billing → budget bar |
| PATCH | `/billing/budget` | Update budget thresholds | — |
| GET | `/billing/top-drivers` | Top cost drivers | Billing → Top Cost Drivers |

### Developer API

| Method | Path | Description | Screen |
|--------|------|-------------|--------|
| GET | `/developer/tokens` | List personal access tokens | Developer & API Settings |
| POST | `/developer/tokens` | Create access token | Developer → Create Token |
| DELETE | `/developer/tokens/:id` | Revoke access token | Developer → Actions |

### Audit Log

| Method | Path | Description | Screen |
|--------|------|-------------|--------|
| GET | `/audit-logs` | List audit log entries (paginated) | Security & Audit Log |
| GET | `/audit-logs/export` | Export audit log as CSV | Audit Log → Export CSV |

Query parameters: `?user=&action=&from=&to=&page=&limit=`

### WebSocket

| Path | Description |
|------|-------------|
| `/ws` | Real-time dashboard updates (upgrade to WebSocket via Durable Object) |

---

## 4. Authentication & Authorization

### Authentication Methods

**Email/Password:**
- Registration: full name + email + password
- Password hashed with Argon2id (via `@noble/hashes`)
- Email verification via Resend (token in KV, 24h TTL)
- Password reset flow: email → token (KV, 1h TTL) → new password

**OAuth 2.0:**
- Providers: Google, GitHub
- PKCE flow (no client secret in browser)
- On callback: match or create user by email, create session
- Link existing account if email matches

### Session Management

```
Login/OAuth success
  │
  ├─► Generate session token (crypto.randomUUID + SHA-256)
  ├─► Store in KV:
  │     Key:   session:{token_hash}
  │     Value: { user_id, account_id, role, created_at, expires_at }
  │     TTL:   7 days (configurable)
  │
  ├─► Set HTTP-only cookie:
  │     Name:     __session
  │     Value:    {token}
  │     Secure:   true
  │     SameSite: Lax
  │     HttpOnly: true
  │     Path:     /
  │     MaxAge:   604800
  │
  └─► Return user profile + CSRF token
```

Session validation on every API request:
1. Extract `__session` cookie
2. Hash token → lookup in KV
3. Check expiry
4. Attach `{ user_id, account_id, role }` to request context

Session refresh: sliding window — extend TTL on each valid request.

### Role-Based Access Control (RBAC)

| Role | Dashboard | Rules | Alerts | Mitigations | Integrations | Team | Billing | Settings | Audit |
|------|-----------|-------|--------|-------------|--------------|------|---------|----------|-------|
| **Admin** | R/W | R/W | R/W | R/W | R/W | R/W | R/W | R/W | R |
| **Editor** | R | R/W | R/W | R/W | R/W | R | R | R | R |
| **Viewer** | R | R | R | R | R | — | — | R | — |

RBAC is enforced via Hono middleware:

```typescript
const requireRole = (...roles: Role[]) => {
  return async (c: Context, next: Next) => {
    const session = c.get("session");
    if (!roles.includes(session.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
};

// Usage
app.post("/rules", requireRole("admin", "editor"), createRule);
```

---

## 5. Cloudflare Integration

### Scoped API Tokens

Users provide a Cloudflare API token with the minimum required permissions:

| Permission | Access | Purpose |
|------------|--------|---------|
| Zone → Analytics | Read | Traffic metrics, firewall events |
| Zone → Zone | Read | Zone listing, zone details |
| Account → Workers Scripts | Read | Worker list, worker analytics |
| Account → Workers KV Storage | Read | KV namespace metrics |
| Account → R2 | Read | Bucket metrics |
| Account → D1 | Read | D1 database metrics |
| Zone → Firewall Services | Write | *Optional* — Guardian Mode mitigation |

### Token Encryption

CF API tokens are encrypted at rest using AES-256-GCM:

```typescript
// Encryption (on token storage)
const key = await crypto.subtle.importKey(
  "raw",
  hexToBytes(env.TOKEN_ENCRYPTION_KEY), // 256-bit key from env secret
  { name: "AES-GCM" },
  false,
  ["encrypt"]
);
const iv = crypto.getRandomValues(new Uint8Array(12));
const ciphertext = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv },
  key,
  new TextEncoder().encode(plainToken)
);
// Store: base64(iv + ciphertext) in D1 cf_tokens.encrypted_token

// Decryption (on CF API call)
// Reverse: split iv (12 bytes) + ciphertext, decrypt with same key
```

The `TOKEN_ENCRYPTION_KEY` is stored as a Workers secret (never in code or wrangler.toml).

### GraphQL Analytics API Queries

Primary queries used for metrics collection:

```graphql
# Zone HTTP traffic (1-minute buckets)
query ZoneTraffic($zoneTag: String!, $since: Time!, $until: Time!) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      httpRequests1mGroups(
        filter: { datetime_geq: $since, datetime_lt: $until }
        limit: 1000
        orderBy: [datetime_ASC]
      ) {
        dimensions { datetime }
        sum {
          requests
          cachedRequests
          bytes
          threats
          pageViews
          countryMap { clientCountryName requests }
        }
        uniq { uniques }
      }
    }
  }
}

# Worker invocations
query WorkerMetrics($accountTag: String!, $since: Time!, $until: Time!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workersInvocationsAdaptive(
        filter: { datetime_geq: $since, datetime_lt: $until }
        limit: 1000
      ) {
        dimensions { datetime scriptName }
        sum {
          requests
          errors
          subrequests
          wallTime
          cpuTime
        }
      }
    }
  }
}
```

### Rate Limit Management

Cloudflare's GraphQL Analytics API enforces rate limits. FlareLens respects these:

- **Budget**: 1,000 queries per 5 minutes per token
- **Strategy**: Batch queries per account (combine zone queries where possible)
- **Backoff**: Exponential backoff on 429 responses (1s → 2s → 4s → max 30s)
- **Tracking**: Store remaining quota in KV (`cf_quota:{account_id}`) with TTL matching reset window
- **Prioritization**: Critical anomaly re-checks get priority over routine polling

---

## 6. Anomaly Detection

### 3-Layer Detection Approach

#### Layer 1: Static Thresholds (User-defined Rules)

Users configure rules via the Rules & Limits UI:

```typescript
interface Rule {
  id: string;
  name: string;          // "KV Read Spike"
  resource_type: string; // "kv" | "workers" | "cdn" | "r2" | "waf" | "zone"
  metric: string;        // "requests" | "cost" | "cpu_time" | "errors"
  operator: "gt" | "lt" | "gte" | "lte";
  threshold: number;     // e.g., 5.00
  window: string;        // "1h" | "1d" | "5m"
  severity: "warning" | "high" | "critical";
  notify_frequency: "instant" | "hourly" | "daily";
  enabled: boolean;
}
```

Evaluation: `currentValue [operator] threshold` → triggers alert if true.

#### Layer 2: Baseline Deviation (7-day Rolling)

Baselines are recalculated every 6 hours:

```
baseline_value = avg(metric) over same time-of-day, same day-of-week, last 4 weeks
baseline_stddev = stddev(metric) over same window

deviation = (current_value - baseline_value) / baseline_stddev

Thresholds:
  deviation > 2.0 → warning
  deviation > 3.0 → high
  deviation > 5.0 → critical
```

Baselines are stored in D1 `baselines` table, keyed by `(resource_id, metric, hour_of_day, day_of_week)`.

#### Layer 3: Velocity Detection

Measures rate-of-change across consecutive data points:

```
velocity = (value[t] - value[t-1]) / interval_minutes
acceleration = (velocity[t] - velocity[t-1]) / interval_minutes

Triggers:
  velocity > 3x baseline_velocity → "rapid increase"
  acceleration > 0 for 3+ consecutive intervals → "sustained acceleration"
```

### Attribution Analysis

When an anomaly is detected, the system identifies contributing factors:

```typescript
interface AnomalyAttribution {
  anomaly_id: string;
  contributors: {
    type: "endpoint" | "user_agent" | "country" | "asn" | "service";
    value: string;        // e.g., "/api/image-resize"
    contribution_pct: number;  // e.g., 41
    current_value: number;
    baseline_value: number;
  }[];
}
```

Attribution is computed by querying CF GraphQL with dimension breakdowns (by clientRequestHTTPHost, clientCountryName, clientRequestUserAgent) and comparing each dimension's current value against its baseline.

---

## 7. Alert Pipeline

### Queue-based Architecture

```
Anomaly detected
  │
  ▼
Queue: alert-dispatch
  │
  ├─► Message schema:
  │   {
  │     anomaly_id: string,
  │     account_id: string,
  │     severity: "warning" | "high" | "critical",
  │     rule_id: string | null,
  │     timestamp: string
  │   }
  │
  ▼
Alert Dispatch Consumer (batch size: 10, max retries: 3)
  │
  ├─► Deduplication check
  ├─► Fan-out to enabled channels
  └─► Record delivery result
```

### Deduplication

Prevents alert storms from repeated threshold crossings:

```
Key:    alert_dedup:{account_id}:{rule_id}:{resource_id}
Value:  { last_sent: timestamp, count: number }
TTL:    Based on notify_frequency setting

Logic:
  if notify_frequency == "instant" → cooldown = 5 minutes
  if notify_frequency == "hourly"  → cooldown = 60 minutes
  if notify_frequency == "daily"   → cooldown = 24 hours

  if (now - last_sent) < cooldown → skip, increment count
  else → send alert (include "X similar alerts suppressed" if count > 0)
```

### Notification Channels

| Channel | Service | Payload |
|---------|---------|---------|
| **Email** | Resend API | HTML template with anomaly summary, attribution, action links |
| **Slack** | Incoming Webhook | Block Kit message: severity badge, metric values, attribution, dashboard link |
| **Discord** | Webhook URL | Embed with color-coded severity, fields for metrics, link to dashboard |
| **PagerDuty** | Events API v2 | Incident with severity mapping (warning→warning, critical→critical) |
| **MS Teams** | Incoming Webhook | Adaptive Card with anomaly details |
| **Custom Webhook** | User-defined URL | JSON payload: `{ event, anomaly, attribution, timestamp }` |
| **In-app** | D1 + Durable Object | Insert notification row, push via WebSocket |

### Notification Frequency Options

Configured per-rule (from Create New Rule modal):

- **Instant Alert** — Send immediately (with 5-min dedup cooldown)
- **Hourly Digest** — Batch alerts per hour, send summary
- **Daily Summary** — Include in daily digest email

---

## 8. Multi-tenancy

All data is isolated by `account_id`. An account represents one FlareLens subscription (which may have multiple team members and multiple CF tokens/zones).

### Isolation Strategy

| Service | Isolation Method |
|---------|-----------------|
| **D1** | Every query includes `WHERE account_id = ?` — enforced at repository layer |
| **KV** | Key prefix: `{account_id}:` for all account-scoped data |
| **Analytics Engine** | `accountId` index on every data point; queries filter by `account_id` |
| **R2** | Object key prefix: `{account_id}/` for all stored objects |
| **Durable Objects** | DO ID derived from account_id: `env.ACCOUNT_LIVE_FEED.idFromName(account_id)` |
| **Queues** | Every message includes `account_id` in payload |

### Enforcement Layer

```typescript
// Repository pattern ensures account_id is always scoped
class RulesRepository {
  constructor(private db: D1Database, private accountId: string) {}

  async list(): Promise<Rule[]> {
    return this.db
      .prepare("SELECT * FROM rules WHERE account_id = ? AND deleted_at IS NULL ORDER BY created_at DESC")
      .bind(this.accountId)
      .all();
  }

  async create(rule: CreateRuleInput): Promise<Rule> {
    // account_id is injected, never from user input
    return this.db
      .prepare("INSERT INTO rules (id, account_id, name, ...) VALUES (?, ?, ?, ...)")
      .bind(newId(), this.accountId, rule.name, ...)
      .run();
  }
}
```

Middleware injects the repository with the session's `account_id`:

```typescript
app.use("/api/*", async (c, next) => {
  const session = c.get("session");
  c.set("repos", {
    rules: new RulesRepository(c.env.DB, session.account_id),
    // ... other repos
  });
  await next();
});
```

---

## 9. D1 Database Schema

### users

```sql
CREATE TABLE users (
  id              TEXT PRIMARY KEY,          -- ULID
  email           TEXT NOT NULL UNIQUE,
  email_verified  INTEGER NOT NULL DEFAULT 0,
  password_hash   TEXT,                      -- null for OAuth-only users
  name            TEXT NOT NULL,
  avatar_url      TEXT,
  oauth_provider  TEXT,                      -- 'google' | 'github' | null
  oauth_id        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_oauth ON users(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL;
```

### accounts

```sql
CREATE TABLE accounts (
  id              TEXT PRIMARY KEY,          -- ULID
  name            TEXT NOT NULL,             -- e.g., "Acme Corp"
  plan            TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'enterprise'
  plan_period_end TEXT,
  stripe_customer_id TEXT,
  settings        TEXT DEFAULT '{}',         -- JSON: timezone, default_notify_freq, etc.
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### team_members

```sql
CREATE TABLE team_members (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  user_id         TEXT REFERENCES users(id), -- null if pending invite
  email           TEXT NOT NULL,             -- for pending invites
  role            TEXT NOT NULL DEFAULT 'viewer',  -- 'admin' | 'editor' | 'viewer'
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'active'
  invited_by      TEXT REFERENCES users(id),
  invited_at      TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at     TEXT,
  last_active_at  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_team_account ON team_members(account_id);
CREATE UNIQUE INDEX idx_team_account_user ON team_members(account_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_team_account_email ON team_members(account_id, email) WHERE status = 'pending';
```

### cf_tokens

```sql
CREATE TABLE cf_tokens (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  label           TEXT NOT NULL,             -- user-given name
  encrypted_token TEXT NOT NULL,             -- AES-256-GCM encrypted
  cf_account_id   TEXT,                      -- Cloudflare account ID
  permissions     TEXT NOT NULL DEFAULT '[]', -- JSON array of granted scopes
  status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'revoked' | 'invalid'
  last_used_at    TEXT,
  verified_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_cf_tokens_account ON cf_tokens(account_id);
```

### resources

```sql
CREATE TABLE resources (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  cf_token_id     TEXT NOT NULL REFERENCES cf_tokens(id),
  cf_resource_id  TEXT NOT NULL,             -- Cloudflare zone/worker/bucket ID
  type            TEXT NOT NULL,             -- 'zone' | 'worker' | 'r2_bucket' | 'kv_namespace' | 'd1_database'
  name            TEXT NOT NULL,             -- e.g., "example.com" or "api-worker"
  monitoring_status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'paused'
  metadata        TEXT DEFAULT '{}',         -- JSON: plan, status, etc.
  last_synced_at  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_resources_account ON resources(account_id);
CREATE UNIQUE INDEX idx_resources_cf ON resources(account_id, cf_resource_id);
```

### zone_snapshots

```sql
CREATE TABLE zone_snapshots (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  resource_id     TEXT NOT NULL REFERENCES resources(id),
  timestamp       TEXT NOT NULL,
  requests        INTEGER NOT NULL DEFAULT 0,
  cached_requests INTEGER NOT NULL DEFAULT 0,
  bytes           INTEGER NOT NULL DEFAULT 0,
  threats         INTEGER NOT NULL DEFAULT 0,
  page_views      INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  estimated_cost  REAL NOT NULL DEFAULT 0,
  top_endpoints   TEXT DEFAULT '[]',         -- JSON
  top_countries   TEXT DEFAULT '[]',         -- JSON
  top_user_agents TEXT DEFAULT '[]',         -- JSON
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_snapshots_resource_ts ON zone_snapshots(resource_id, timestamp);
CREATE INDEX idx_snapshots_account_ts ON zone_snapshots(account_id, timestamp);
```

### baselines

```sql
CREATE TABLE baselines (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  resource_id     TEXT NOT NULL REFERENCES resources(id),
  metric          TEXT NOT NULL,             -- 'requests' | 'cost' | 'errors' | 'cpu_time'
  hour_of_day     INTEGER NOT NULL,          -- 0-23
  day_of_week     INTEGER NOT NULL,          -- 0-6 (Sun-Sat)
  avg_value       REAL NOT NULL,
  stddev_value    REAL NOT NULL,
  sample_count    INTEGER NOT NULL,
  last_calculated TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_baselines_unique ON baselines(resource_id, metric, hour_of_day, day_of_week);
CREATE INDEX idx_baselines_account ON baselines(account_id);
```

### rules

```sql
CREATE TABLE rules (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  name            TEXT NOT NULL,
  resource_type   TEXT NOT NULL,             -- 'zone' | 'workers' | 'kv' | 'r2' | 'cdn' | 'waf'
  resource_id     TEXT REFERENCES resources(id),  -- null = applies to all of type
  metric          TEXT NOT NULL,             -- 'requests' | 'cost' | 'errors' | 'cpu_time' | 'bandwidth'
  operator        TEXT NOT NULL DEFAULT 'gt',
  threshold       REAL NOT NULL,
  window          TEXT NOT NULL DEFAULT '1h', -- '5m' | '1h' | '1d'
  severity        TEXT NOT NULL DEFAULT 'warning',
  notify_frequency TEXT NOT NULL DEFAULT 'instant',
  enabled         INTEGER NOT NULL DEFAULT 1,
  created_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at      TEXT
);
CREATE INDEX idx_rules_account ON rules(account_id);
```

### anomalies

```sql
CREATE TABLE anomalies (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  resource_id     TEXT NOT NULL REFERENCES resources(id),
  rule_id         TEXT REFERENCES rules(id), -- null if baseline-detected
  detection_type  TEXT NOT NULL,             -- 'threshold' | 'baseline' | 'velocity'
  metric          TEXT NOT NULL,
  severity        TEXT NOT NULL,             -- 'warning' | 'high' | 'critical'
  current_value   REAL NOT NULL,
  baseline_value  REAL,
  deviation       REAL,
  attribution     TEXT DEFAULT '[]',         -- JSON: AnomalyAttribution[]
  status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'dismissed' | 'resolved'
  dismissed_by    TEXT REFERENCES users(id),
  resolved_at     TEXT,
  detected_at     TEXT NOT NULL DEFAULT (datetime('now')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_anomalies_account_status ON anomalies(account_id, status);
CREATE INDEX idx_anomalies_resource ON anomalies(resource_id, detected_at);
```

### notifications

```sql
CREATE TABLE notifications (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  user_id         TEXT REFERENCES users(id), -- null = account-wide
  type            TEXT NOT NULL,             -- 'anomaly' | 'budget' | 'billing' | 'system' | 'mitigation'
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'info', -- 'info' | 'warning' | 'critical'
  link            TEXT,                      -- deep link to relevant page
  read            INTEGER NOT NULL DEFAULT 0,
  archived        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notifications_user ON notifications(account_id, user_id, read, archived);
```

### alert_deliveries

```sql
CREATE TABLE alert_deliveries (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  anomaly_id      TEXT NOT NULL REFERENCES anomalies(id),
  channel         TEXT NOT NULL,             -- 'email' | 'slack' | 'discord' | 'pagerduty' | 'teams' | 'webhook'
  integration_id  TEXT,
  status          TEXT NOT NULL,             -- 'sent' | 'failed' | 'skipped'
  error_message   TEXT,
  sent_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_deliveries_anomaly ON alert_deliveries(anomaly_id);
```

### mitigations

```sql
CREATE TABLE mitigations (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  name            TEXT NOT NULL,             -- "Auto Rate-limit"
  trigger_type    TEXT NOT NULL,             -- 'traffic_rate' | 'error_spike' | 'cost_threshold'
  trigger_condition TEXT NOT NULL,           -- JSON: { metric, operator, threshold }
  action_type     TEXT NOT NULL,             -- 'rate_limit' | 'under_attack_mode' | 'block_ua' | 'pause_worker'
  action_config   TEXT NOT NULL,             -- JSON: action-specific config
  resource_id     TEXT REFERENCES resources(id),
  enabled         INTEGER NOT NULL DEFAULT 0,
  last_triggered  TEXT,
  trigger_count   INTEGER NOT NULL DEFAULT 0,
  estimated_savings REAL NOT NULL DEFAULT 0,
  created_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_mitigations_account ON mitigations(account_id);
```

### integrations

```sql
CREATE TABLE integrations (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  type            TEXT NOT NULL,             -- 'slack' | 'discord' | 'pagerduty' | 'teams' | 'webhook'
  name            TEXT NOT NULL,
  config          TEXT NOT NULL,             -- JSON (encrypted webhook URLs)
  status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive' | 'error'
  last_used_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_integrations_account ON integrations(account_id);
CREATE UNIQUE INDEX idx_integrations_account_type ON integrations(account_id, type)
  WHERE type != 'webhook';  -- only one per type except webhooks
```

### developer_tokens

```sql
CREATE TABLE developer_tokens (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  user_id         TEXT NOT NULL REFERENCES users(id),
  name            TEXT NOT NULL,
  token_hash      TEXT NOT NULL UNIQUE,      -- SHA-256 of the token
  token_prefix    TEXT NOT NULL,             -- first 8 chars for display
  last_used_at    TEXT,
  expires_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_dev_tokens_account ON developer_tokens(account_id);
```

### audit_logs

```sql
CREATE TABLE audit_logs (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  user_id         TEXT REFERENCES users(id), -- null for system actions
  user_email      TEXT,
  action          TEXT NOT NULL,             -- 'create' | 'update' | 'delete' | 'auth' | 'system'
  entity_type     TEXT NOT NULL,             -- 'rule' | 'integration' | 'mitigation' | 'team' | 'token' | 'settings'
  entity_id       TEXT,
  description     TEXT NOT NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  metadata        TEXT DEFAULT '{}',         -- JSON: additional context
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_account_ts ON audit_logs(account_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(account_id, user_id);
CREATE INDEX idx_audit_action ON audit_logs(account_id, action);
```

### billing_snapshots

```sql
CREATE TABLE billing_snapshots (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  period_start    TEXT NOT NULL,
  period_end      TEXT NOT NULL,
  total_cost      REAL NOT NULL DEFAULT 0,
  cost_by_service TEXT NOT NULL DEFAULT '{}', -- JSON: { workers: 202.61, cdn: 112.56, ... }
  budget_limit    REAL,
  status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'closed'
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_billing_account ON billing_snapshots(account_id, period_start);
```

---

## 10. Cron Job Design

### Overview

| Cron | Schedule | Description | Max Duration |
|------|----------|-------------|--------------|
| **metrics-poll** | `*/5 * * * *` (every 5 min) | Poll CF GraphQL API for all active accounts | 30s |
| **baseline-recalc** | `0 */6 * * *` (every 6 hours) | Recalculate 7-day rolling baselines | 60s |
| **daily-digest** | `0 8 * * *` (8 AM UTC) | Send daily summary emails | 30s |
| **resource-sync** | `0 */12 * * *` (every 12 hours) | Sync resource inventory from CF API | 30s |
| **housekeeping** | `0 3 * * *` (3 AM UTC daily) | Clean up expired data, compact tables | 60s |

### Cron 1: Metrics Polling (`metrics-poll`)

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const accounts = await getActiveAccounts(env.DB);

    // Process accounts in batches to stay within CPU limits
    const BATCH_SIZE = 10;
    for (const batch of chunk(accounts, BATCH_SIZE)) {
      await Promise.allSettled(
        batch.map(account => pollAccountMetrics(account, env))
      );
    }
  }
};

async function pollAccountMetrics(account: Account, env: Env) {
  const token = await decryptToken(account.cf_token, env.TOKEN_ENCRYPTION_KEY);
  const resources = await getActiveResources(env.DB, account.id);

  for (const resource of resources) {
    const metrics = await queryCFGraphQL(token, resource);
    await env.ANALYTICS.writeDataPoint({
      blobs: [account.id, resource.id, resource.type],
      doubles: [metrics.requests, metrics.bytes, metrics.cost],
      indexes: [account.id],
    });
    await upsertSnapshot(env.DB, account.id, resource.id, metrics);
    await env.ALERT_QUEUE.send({
      type: "anomaly-check",
      account_id: account.id,
      resource_id: resource.id,
      metrics,
    });
  }
}
```

### Cron 2: Baseline Recalculation (`baseline-recalc`)

Queries Analytics Engine for the past 28 days of data, grouped by hour-of-day and day-of-week. Computes rolling average and standard deviation for each `(resource, metric, hour, day_of_week)` tuple. Upserts results into `baselines` table.

### Cron 3: Daily Digest (`daily-digest`)

For each account with daily digest enabled:
1. Query anomalies from last 24 hours
2. Query current billing snapshot
3. Compare spend against budget
4. Render email template with summary
5. Send via Resend API

### Cron 4: Resource Sync (`resource-sync`)

For each account:
1. Call CF REST API: `GET /zones`, `GET /workers/scripts`, `GET /r2/buckets`
2. Compare with existing `resources` table
3. Insert new resources, mark removed ones as inactive
4. Update `last_synced_at`

### Cron 5: Housekeeping (`housekeeping`)

- Delete `zone_snapshots` older than retention period (7d free, 30d pro, unlimited enterprise)
- Delete `audit_logs` older than retention period
- Delete expired sessions from KV (handled by KV TTL, but verify)
- Purge soft-deleted records (`deleted_at` older than 30 days)
- Compact notification table (archive read notifications older than 30 days)

---

## 11. Security

### Token Encryption

- CF API tokens: AES-256-GCM with per-token random IV (see section 5)
- Integration webhook URLs: AES-256-GCM encrypted in `integrations.config`
- Encryption key: Workers secret `TOKEN_ENCRYPTION_KEY`
- Key rotation: supported via versioned keys (store key version with ciphertext)

### Password Hashing

- Algorithm: Argon2id via `@noble/hashes/argon2`
- Parameters: `{ m: 65536, t: 3, p: 4 }` (64 MB memory, 3 iterations, 4 parallelism)
- Random 16-byte salt per password
- Stored format: `$argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>`

### CORS

```typescript
app.use("*", cors({
  origin: ["https://flarelens.com", "https://app.flarelens.com"],
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  credentials: true,
  maxAge: 86400,
}));
```

### Rate Limiting

Enforced via KV counters per account + endpoint group:

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| Auth (login/register) | 10 requests | 15 min |
| Auth (password reset) | 5 requests | 1 hour |
| API reads | 300 requests | 1 min |
| API writes | 60 requests | 1 min |
| Developer API | 120 requests | 1 min |
| Webhook test | 5 requests | 5 min |

Implementation:

```typescript
async function rateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number }> {
  const kvKey = `rl:${key}`;
  const current = await kv.get(kvKey, "json") as { count: number } | null;
  const count = current?.count ?? 0;

  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  await kv.put(kvKey, JSON.stringify({ count: count + 1 }), {
    expirationTtl: windowSec,
  });

  return { allowed: true, remaining: limit - count - 1 };
}
```

### Input Validation (Zod)

All API inputs validated with Zod schemas:

```typescript
const CreateRuleSchema = z.object({
  name: z.string().min(1).max(100),
  resource_type: z.enum(["zone", "workers", "kv", "r2", "cdn", "waf"]),
  metric: z.enum(["requests", "cost", "errors", "cpu_time", "bandwidth"]),
  operator: z.enum(["gt", "lt", "gte", "lte"]).default("gt"),
  threshold: z.number().positive().max(1_000_000),
  window: z.enum(["5m", "1h", "1d"]).default("1h"),
  severity: z.enum(["warning", "high", "critical"]).default("warning"),
  notify_frequency: z.enum(["instant", "hourly", "daily"]).default("instant"),
});
```

Validation middleware:

```typescript
const validate = <T>(schema: ZodSchema<T>) => {
  return async (c: Context, next: Next) => {
    const body = await c.req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return c.json({ error: "Validation failed", details: result.error.flatten() }, 400);
    }
    c.set("validated", result.data);
    await next();
  };
};
```

### Audit Logging

Every mutating action (create, update, delete) and auth event is recorded:

```typescript
async function auditLog(db: D1Database, entry: {
  account_id: string;
  user_id: string | null;
  user_email: string | null;
  action: "create" | "update" | "delete" | "auth" | "system";
  entity_type: string;
  entity_id: string | null;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.prepare(`
    INSERT INTO audit_logs (id, account_id, user_id, user_email, action, entity_type, entity_id, description, ip_address, user_agent, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    newUlid(), entry.account_id, entry.user_id, entry.user_email,
    entry.action, entry.entity_type, entry.entity_id, entry.description,
    entry.ip_address, entry.user_agent, JSON.stringify(entry.metadata ?? {})
  ).run();
}
```

### CSRF Protection

- SPA approach: API validates `Origin` / `Referer` header against allowed origins
- Double-submit cookie: `X-CSRF-Token` header must match token stored in session
- Safe methods (GET, HEAD, OPTIONS) are exempt

---

## 12. Plan Tier Limits

### Feature Matrix

| Feature | Hobby (Free) | Pro ($29/mo) | Enterprise (Custom) |
|---------|:------------:|:------------:|:-------------------:|
| Monitored resources | 1 worker | Unlimited | Unlimited |
| Monitoring rules | 3 | Unlimited | Unlimited |
| Anomaly detection | Daily checks | Real-time (5-min) | Real-time (5-min) |
| Alert channels | Email only | Email, Slack, Discord, Webhooks | All + PagerDuty, MS Teams |
| SMS alerts | — | Instant SMS & Email | Instant SMS & Email |
| Team members | 1 (owner only) | 5 | Unlimited |
| RBAC roles | — | Admin, Editor, Viewer | Advanced (custom roles) |
| Data retention | 7 days | 30 days | Unlimited |
| Audit log | — | 30 days | Unlimited |
| Guardian Mode (mitigations) | — | 3 rules | Unlimited |
| Custom API integrations | — | — | Yes |
| Developer API access | — | Yes | Yes |
| Baseline analysis | — | Yes | Yes |
| CSV/PDF export | — | Yes | Yes |
| Support | Community | Priority email | 24/7 dedicated phone |

### Enforcement

Plan limits are checked at the API layer:

```typescript
const PLAN_LIMITS = {
  free:       { resources: 1,  rules: 3,  team: 1,  mitigations: 0, retention_days: 7  },
  pro:        { resources: -1, rules: -1, team: 5,  mitigations: 3, retention_days: 30 },
  enterprise: { resources: -1, rules: -1, team: -1, mitigations: -1, retention_days: -1 },
} as const; // -1 = unlimited

async function checkPlanLimit(
  db: D1Database,
  accountId: string,
  resource: keyof PlanLimits,
): Promise<boolean> {
  const account = await getAccount(db, accountId);
  const limit = PLAN_LIMITS[account.plan][resource];
  if (limit === -1) return true;

  const current = await countResource(db, accountId, resource);
  return current < limit;
}
```

---

## 13. Deployment

### wrangler.toml Configuration

```toml
name = "flarelens-api"
main = "src/worker.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# ─── Bindings ────────────────────────────────────────────
[[d1_databases]]
binding = "DB"
database_name = "flarelens-prod"
database_id = "<d1-database-id>"

[[kv_namespaces]]
binding = "KV"
id = "<kv-namespace-id>"

[[r2_buckets]]
binding = "R2"
bucket_name = "flarelens-exports"

[[queues.producers]]
binding = "ALERT_QUEUE"
queue = "flarelens-alerts"

[[queues.consumers]]
queue = "flarelens-alerts"
max_batch_size = 10
max_retries = 3
dead_letter_queue = "flarelens-alerts-dlq"

[[queues.producers]]
binding = "POLL_QUEUE"
queue = "flarelens-poll"

[[queues.consumers]]
queue = "flarelens-poll"
max_batch_size = 5
max_retries = 2

[durable_objects]
bindings = [
  { name = "ACCOUNT_LIVE_FEED", class_name = "AccountLiveFeed" },
]

[[migrations]]
tag = "v1"
new_classes = ["AccountLiveFeed"]

[analytics_engine]
binding = "ANALYTICS"

# ─── Cron Triggers ───────────────────────────────────────
[triggers]
crons = [
  "*/5 * * * *",   # metrics-poll
  "0 */6 * * *",   # baseline-recalc
  "0 8 * * *",     # daily-digest
  "0 */12 * * *",  # resource-sync
  "0 3 * * *",     # housekeeping
]

# ─── Secrets (set via wrangler secret put) ───────────────
# TOKEN_ENCRYPTION_KEY  - AES-256 key for CF token encryption
# RESEND_API_KEY        - Resend email service
# GOOGLE_CLIENT_ID      - OAuth
# GOOGLE_CLIENT_SECRET  - OAuth
# GITHUB_CLIENT_ID      - OAuth
# GITHUB_CLIENT_SECRET  - OAuth

# ─── Environments ────────────────────────────────────────
[env.staging]
name = "flarelens-api-staging"
vars = { ENVIRONMENT = "staging", LOG_LEVEL = "debug" }

[[env.staging.d1_databases]]
binding = "DB"
database_name = "flarelens-staging"
database_id = "<staging-d1-id>"

[[env.staging.kv_namespaces]]
binding = "KV"
id = "<staging-kv-id>"

[env.production]
name = "flarelens-api"
vars = { ENVIRONMENT = "production", LOG_LEVEL = "warn" }
routes = [{ pattern = "api.flarelens.com/*", zone_name = "flarelens.com" }]
```

### D1 Migrations

Migrations stored in `migrations/` directory, executed via `wrangler d1 migrations apply`:

```
migrations/
  0001_initial_schema.sql        # users, accounts, team_members
  0002_cf_tokens_resources.sql   # cf_tokens, resources
  0003_monitoring_tables.sql     # zone_snapshots, baselines, rules, anomalies
  0004_alerts_notifications.sql  # notifications, alert_deliveries
  0005_mitigations.sql           # mitigations
  0006_integrations.sql          # integrations
  0007_developer_tokens.sql      # developer_tokens
  0008_audit_billing.sql         # audit_logs, billing_snapshots
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run typecheck
      - run: pnpm run lint
      - run: pnpm run test

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec wrangler d1 migrations apply flarelens-staging --env staging
      - run: pnpm exec wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - name: Deploy API Worker
        run: |
          pnpm exec wrangler d1 migrations apply flarelens-prod --env production
          pnpm exec wrangler deploy --env production --config packages/api/wrangler.toml
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
      - name: Build & Deploy Frontend Worker
        run: |
          pnpm run build --workspace=packages/web
          pnpm exec wrangler deploy --env production --config packages/web/wrangler.toml
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
```

### SvelteKit Frontend Deployment

The SvelteKit frontend deploys as a Worker using `@sveltejs/adapter-cloudflare`:

```toml
# wrangler.toml (frontend)
name = "flarelens-web"
main = ".svelte-kit/cloudflare/_worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
assets = { directory = ".svelte-kit/cloudflare", binding = "ASSETS" }

routes = [{ pattern = "flarelens.com/*", zone_name = "flarelens.com" }]

[vars]
PUBLIC_API_URL = "https://api.flarelens.com"

[env.staging]
name = "flarelens-web-staging"
routes = [{ pattern = "staging.flarelens.com/*", zone_name = "flarelens.com" }]
```

---

## 14. Scaling & Error Handling

### D1 Limits & Strategies

| Limit | Value | Mitigation |
|-------|-------|------------|
| Max DB size | 10 GB (paid) | Archive old snapshots to R2; housekeeping cron |
| Max rows read per query | 1,000,000 | Paginate large queries; use indexes effectively |
| Max rows written per query | 100,000 | Batch writes in chunks |
| Max query duration | 30s | Avoid complex JOINs on large tables; denormalize where needed |
| Max queries per Worker invocation | Unlimited | But keep total CPU time under 30s |

**Strategy**: Use Analytics Engine for high-volume time-series data (metrics). D1 is for relational/transactional data only (users, rules, configs). This keeps D1 lean.

### Worker CPU Limits

| Plan | CPU Time per Invocation |
|------|------------------------|
| Free | 10 ms |
| Paid (Bundled) | 50 ms |
| Paid (Unbound) | 30 s |

**Strategy**: Use Unbound usage model. For polling cron, process accounts in batches via Queue to distribute CPU across multiple invocations.

### Cloudflare API Failure Handling

```typescript
async function queryCFGraphQL(
  token: string,
  query: string,
  variables: Record<string, unknown>,
  retries = 3
): Promise<CFGraphQLResponse> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "5");
        await sleep(retryAfter * 1000);
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        // Token invalid or insufficient permissions
        await markTokenInvalid(token);
        throw new CFTokenError("Token invalid or insufficient permissions");
      }

      if (!response.ok) {
        throw new CFAPIError(`CF API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.errors?.length) {
        throw new CFGraphQLError(data.errors);
      }

      return data;
    } catch (err) {
      if (attempt === retries || err instanceof CFTokenError) throw err;
      await sleep(Math.pow(2, attempt) * 1000); // exponential backoff
    }
  }
  throw new Error("Exhausted retries");
}
```

### Retry Strategies

| Scenario | Strategy |
|----------|----------|
| CF API 429 (rate limited) | Respect `Retry-After` header, exponential backoff (1s → 2s → 4s), max 3 retries |
| CF API 5xx | Exponential backoff, max 3 retries, then skip account for this cycle |
| CF token invalid (401/403) | No retry — mark token as `invalid`, notify user, stop polling |
| Alert dispatch failure | Queue retry (max 3), then move to dead-letter queue, log failure |
| D1 write failure | Retry once, then log error and continue (don't block polling) |
| Email delivery failure (Resend) | Queue retry with backoff, max 3 attempts |
| WebSocket disconnect | Client auto-reconnects with exponential backoff (SvelteKit store) |

### Graceful Degradation

- If baseline data is insufficient (< 7 days history), skip Layer 2 detection, rely on Layer 1 (static thresholds) only
- If CF API quota exhausted, serve cached data from KV (mark as stale in UI)
- If Queue is backed up, prioritize critical-severity alerts
- If D1 is unavailable, read-only mode using KV-cached data

### Monitoring & Observability

- **Worker errors**: Captured via `console.error` → visible in Workers dashboard
- **Queue dead-letter**: Monitor DLQ depth via CF dashboard
- **Structured logging**: JSON logs with `{ level, message, account_id, trace_id, duration_ms }`
- **Health endpoint**: `GET /health` returns `{ status: "ok", version, d1: true, kv: true }`

---

## Appendix: UI Screen → API Route Mapping

| Screen Group | Screenshots | Primary API Routes |
|-------------|-------------|-------------------|
| Landing Page | `landing_page_overview_1-5`, `landing_page_pricing_section`, `landing_page_footer_*` | `[public]` — static/prerendered pages (SvelteKit on Workers) |
| Sign Up / Log In | `log_in_page_*` | `/auth/register`, `/auth/login`, `/auth/oauth/:provider` |
| Forgot Password | `forgot_password_page_1-2` | `/auth/forgot-password`, `/auth/reset-password` |
| Onboarding | `onboarding_success_celebration_1-2` | `/cf-tokens`, `/cf-tokens/:id/verify`, `/resources/sync` |
| Dashboard Overview | `dashboard_overview_1-27` | `/analytics/overview`, `/analytics/baseline`, `/analytics/bot-activity`, `/analytics/cost` |
| Analytics | `analytics_dashboard_overview_1-3`, `analytics_performance_details_1-2` | `/analytics/traffic`, `/analytics/performance`, `/analytics/cost`, `/analytics/errors`, `/analytics/top-endpoints`, `/analytics/geo`, `/analytics/clients` |
| Rules & Limits | `rules_limits_management_1-2` | `/rules`, `/rules/:id`, `/rules/:id/toggle` |
| Automated Mitigation | `automated_mitigation_rules_1-3` | `/mitigations`, `/mitigations/:id/toggle` |
| Notification Inbox | `notification_center_inbox_1-3` | `/notifications`, `/notifications/:id/read`, `/notifications/mark-all-read`, `/notifications/archive-all` |
| Integrations | `integrations_dashboard`, `integrations_management` | `/integrations`, `/integrations/slack`, `/integrations/discord`, `/integrations/webhooks` |
| Team Management | `team_management_unified_layout` | `/team/members`, `/team/invites` |
| Billing | `dashboard_overview_1,14` (billing views) | `/billing/overview`, `/billing/breakdown`, `/billing/invoices`, `/billing/budget` |
| Infrastructure Inventory | `infrastructure_inventory_1-3` | `/resources`, `/resources/:id`, `/resources/sync` |
| Security & Audit Log | `security_audit_log_1-3` | `/audit-logs`, `/audit-logs/export` |
| Developer & API Settings | `developer_api_settings_1-3` | `/developer/tokens`, `/integrations/webhooks` |
| Settings | (within various screens) | `/settings/profile`, `/settings/notifications`, `/settings/account` |

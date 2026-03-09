-- FlareLens D1 Database Schema
-- Migration: 0001_init
-- Created: 2026-03-09

-- ─────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────
CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  email_verified  INTEGER NOT NULL DEFAULT 0,
  password_hash   TEXT,
  name            TEXT NOT NULL,
  avatar_url      TEXT,
  oauth_provider  TEXT,
  oauth_id        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_oauth ON users(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL;

-- ─────────────────────────────────────────
-- Accounts
-- ─────────────────────────────────────────
CREATE TABLE accounts (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'free',
  plan_period_end TEXT,
  stripe_customer_id TEXT,
  settings        TEXT NOT NULL DEFAULT '{}',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- Team Members
-- ─────────────────────────────────────────
CREATE TABLE team_members (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  user_id         TEXT REFERENCES users(id),
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'viewer',
  status          TEXT NOT NULL DEFAULT 'pending',
  invited_by      TEXT REFERENCES users(id),
  invited_at      TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at     TEXT,
  last_active_at  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_team_account ON team_members(account_id);
CREATE UNIQUE INDEX idx_team_account_user ON team_members(account_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_team_account_email ON team_members(account_id, email) WHERE status = 'pending';

-- ─────────────────────────────────────────
-- Cloudflare API Tokens
-- ─────────────────────────────────────────
CREATE TABLE cf_tokens (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  label           TEXT NOT NULL,
  encrypted_token TEXT NOT NULL,
  cf_account_id   TEXT,
  permissions     TEXT NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'active',
  last_used_at    TEXT,
  verified_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_cf_tokens_account ON cf_tokens(account_id);

-- ─────────────────────────────────────────
-- Resources
-- ─────────────────────────────────────────
CREATE TABLE resources (
  id                TEXT PRIMARY KEY,
  account_id        TEXT NOT NULL REFERENCES accounts(id),
  cf_token_id       TEXT NOT NULL REFERENCES cf_tokens(id),
  cf_resource_id    TEXT NOT NULL,
  type              TEXT NOT NULL,
  name              TEXT NOT NULL,
  monitoring_status TEXT NOT NULL DEFAULT 'active',
  metadata          TEXT NOT NULL DEFAULT '{}',
  last_synced_at    TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_resources_account ON resources(account_id);
CREATE UNIQUE INDEX idx_resources_cf ON resources(account_id, cf_resource_id);

-- ─────────────────────────────────────────
-- Zone Snapshots
-- ─────────────────────────────────────────
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
  top_endpoints   TEXT NOT NULL DEFAULT '[]',
  top_countries   TEXT NOT NULL DEFAULT '[]',
  top_user_agents TEXT NOT NULL DEFAULT '[]',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_snapshots_resource_ts ON zone_snapshots(resource_id, timestamp);
CREATE INDEX idx_snapshots_account_ts ON zone_snapshots(account_id, timestamp);

-- ─────────────────────────────────────────
-- Baselines
-- ─────────────────────────────────────────
CREATE TABLE baselines (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  resource_id     TEXT NOT NULL REFERENCES resources(id),
  metric          TEXT NOT NULL,
  hour_of_day     INTEGER NOT NULL,
  day_of_week     INTEGER NOT NULL,
  avg_value       REAL NOT NULL,
  stddev_value    REAL NOT NULL,
  sample_count    INTEGER NOT NULL,
  last_calculated TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_baselines_unique ON baselines(resource_id, metric, hour_of_day, day_of_week);
CREATE INDEX idx_baselines_account ON baselines(account_id);

-- ─────────────────────────────────────────
-- Rules
-- ─────────────────────────────────────────
CREATE TABLE rules (
  id               TEXT PRIMARY KEY,
  account_id       TEXT NOT NULL REFERENCES accounts(id),
  name             TEXT NOT NULL,
  resource_type    TEXT NOT NULL,
  resource_id      TEXT REFERENCES resources(id),
  metric           TEXT NOT NULL,
  operator         TEXT NOT NULL DEFAULT 'gt',
  threshold        REAL NOT NULL,
  window           TEXT NOT NULL DEFAULT '1h',
  severity         TEXT NOT NULL DEFAULT 'warning',
  notify_frequency TEXT NOT NULL DEFAULT 'instant',
  enabled          INTEGER NOT NULL DEFAULT 1,
  created_by       TEXT REFERENCES users(id),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at       TEXT
);
CREATE INDEX idx_rules_account ON rules(account_id);

-- ─────────────────────────────────────────
-- Anomalies
-- ─────────────────────────────────────────
CREATE TABLE anomalies (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  resource_id     TEXT NOT NULL REFERENCES resources(id),
  rule_id         TEXT REFERENCES rules(id),
  detection_type  TEXT NOT NULL,
  metric          TEXT NOT NULL,
  severity        TEXT NOT NULL,
  current_value   REAL NOT NULL,
  baseline_value  REAL,
  deviation       REAL,
  attribution     TEXT NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'active',
  dismissed_by    TEXT REFERENCES users(id),
  resolved_at     TEXT,
  detected_at     TEXT NOT NULL DEFAULT (datetime('now')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_anomalies_account_status ON anomalies(account_id, status);
CREATE INDEX idx_anomalies_resource ON anomalies(resource_id, detected_at);

-- ─────────────────────────────────────────
-- Notifications
-- ─────────────────────────────────────────
CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  user_id     TEXT REFERENCES users(id),
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'info',
  link        TEXT,
  read        INTEGER NOT NULL DEFAULT 0,
  archived    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notifications_user ON notifications(account_id, user_id, read, archived);

-- ─────────────────────────────────────────
-- Alert Deliveries
-- ─────────────────────────────────────────
CREATE TABLE alert_deliveries (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  anomaly_id      TEXT NOT NULL REFERENCES anomalies(id),
  channel         TEXT NOT NULL,
  integration_id  TEXT,
  status          TEXT NOT NULL,
  error_message   TEXT,
  sent_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_deliveries_anomaly ON alert_deliveries(anomaly_id);

-- ─────────────────────────────────────────
-- Mitigations
-- ─────────────────────────────────────────
CREATE TABLE mitigations (
  id                TEXT PRIMARY KEY,
  account_id        TEXT NOT NULL REFERENCES accounts(id),
  name              TEXT NOT NULL,
  trigger_type      TEXT NOT NULL,
  trigger_condition TEXT NOT NULL,
  action_type       TEXT NOT NULL,
  action_config     TEXT NOT NULL,
  resource_id       TEXT REFERENCES resources(id),
  enabled           INTEGER NOT NULL DEFAULT 0,
  last_triggered    TEXT,
  trigger_count     INTEGER NOT NULL DEFAULT 0,
  estimated_savings REAL NOT NULL DEFAULT 0,
  created_by        TEXT REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_mitigations_account ON mitigations(account_id);

-- ─────────────────────────────────────────
-- Integrations
-- ─────────────────────────────────────────
CREATE TABLE integrations (
  id           TEXT PRIMARY KEY,
  account_id   TEXT NOT NULL REFERENCES accounts(id),
  type         TEXT NOT NULL,
  name         TEXT NOT NULL,
  config       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  last_used_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_integrations_account ON integrations(account_id);
CREATE UNIQUE INDEX idx_integrations_account_type ON integrations(account_id, type)
  WHERE type != 'webhook';

-- ─────────────────────────────────────────
-- Developer Tokens
-- ─────────────────────────────────────────
CREATE TABLE developer_tokens (
  id           TEXT PRIMARY KEY,
  account_id   TEXT NOT NULL REFERENCES accounts(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  name         TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  last_used_at TEXT,
  expires_at   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_dev_tokens_account ON developer_tokens(account_id);

-- ─────────────────────────────────────────
-- Audit Logs
-- ─────────────────────────────────────────
CREATE TABLE audit_logs (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  user_id     TEXT REFERENCES users(id),
  user_email  TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  description TEXT NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  metadata    TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_account ON audit_logs(account_id, created_at);
CREATE INDEX idx_audit_user ON audit_logs(user_id);

-- ─────────────────────────────────────────
-- Billing Snapshots
-- ─────────────────────────────────────────
CREATE TABLE billing_snapshots (
  id                TEXT PRIMARY KEY,
  account_id        TEXT NOT NULL REFERENCES accounts(id),
  period_start      TEXT NOT NULL,
  period_end        TEXT NOT NULL,
  total_cost        REAL NOT NULL DEFAULT 0,
  breakdown         TEXT NOT NULL DEFAULT '{}',
  budget_limit      REAL,
  status            TEXT NOT NULL DEFAULT 'active',
  stripe_invoice_id TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_billing_account ON billing_snapshots(account_id, period_start);

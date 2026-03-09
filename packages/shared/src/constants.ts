import type { Plan, Role } from './types.js';

// Plan limits
export const PLAN_LIMITS: Record<Plan, {
  max_resources: number;
  max_rules: number;
  max_team_members: number;
  max_integrations: number;
  data_retention_days: number;
  api_rate_limit_per_min: number;
}> = {
  free: {
    max_resources: 3,
    max_rules: 5,
    max_team_members: 1,
    max_integrations: 1,
    data_retention_days: 7,
    api_rate_limit_per_min: 60,
  },
  pro: {
    max_resources: 25,
    max_rules: 50,
    max_team_members: 5,
    max_integrations: 10,
    data_retention_days: 90,
    api_rate_limit_per_min: 300,
  },
  enterprise: {
    max_resources: Infinity,
    max_rules: Infinity,
    max_team_members: Infinity,
    max_integrations: Infinity,
    data_retention_days: 365,
    api_rate_limit_per_min: 1000,
  },
};

// Role permissions matrix
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [
    'dashboard:read', 'dashboard:write',
    'rules:read', 'rules:write',
    'anomalies:read', 'anomalies:write',
    'mitigations:read', 'mitigations:write',
    'integrations:read', 'integrations:write',
    'team:read', 'team:write',
    'billing:read', 'billing:write',
    'settings:read', 'settings:write',
    'audit:read',
    'tokens:read', 'tokens:write',
    'resources:read', 'resources:write',
    'developer:read', 'developer:write',
  ],
  editor: [
    'dashboard:read',
    'rules:read', 'rules:write',
    'anomalies:read', 'anomalies:write',
    'mitigations:read', 'mitigations:write',
    'integrations:read', 'integrations:write',
    'team:read',
    'billing:read',
    'settings:read',
    'audit:read',
    'resources:read', 'resources:write',
  ],
  viewer: [
    'dashboard:read',
    'rules:read',
    'anomalies:read',
    'mitigations:read',
    'integrations:read',
    'resources:read',
    'settings:read',
    'audit:read',
  ],
};

// Session
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const SESSION_COOKIE_NAME = '__session';
export const SESSION_KEY_PREFIX = 'session:';

// Rate limits (requests per window)
export const RATE_LIMITS = {
  auth: { limit: 10, window_seconds: 900 },         // 10/15min
  reads: { limit: 300, window_seconds: 60 },         // 300/min
  writes: { limit: 60, window_seconds: 60 },          // 60/min
  cf_verify: { limit: 5, window_seconds: 60 },        // 5/min
} as const;

// Anomaly detection thresholds
export const BASELINE_DEVIATION_THRESHOLDS = {
  warning: 2.0,
  high: 3.0,
  critical: 5.0,
} as const;

// Alert deduplication TTLs (seconds)
export const ALERT_DEDUP_TTL: Record<string, number> = {
  instant: 60 * 5,     // 5 min
  hourly: 60 * 60,     // 1 hour
  daily: 60 * 60 * 24, // 24 hours
};

// CF GraphQL rate limit
export const CF_GRAPHQL_RATE_LIMIT = {
  queries_per_window: 1000,
  window_seconds: 300, // 5 minutes
};

// Resource types list
export const RESOURCE_TYPES = ['zone', 'worker', 'r2_bucket', 'kv_namespace', 'd1_database'] as const;

// Metric names
export const METRIC_NAMES = ['requests', 'cost', 'errors', 'cpu_time', 'bandwidth', 'cached_requests', 'bytes', 'threats'] as const;

// Cost per unit (approximate CF pricing)
export const CF_COST_PER_UNIT = {
  worker_requests_per_million: 0.30,
  worker_cpu_ms_per_million: 0.02,
  r2_class_a_per_million: 4.50,
  r2_class_b_per_million: 0.36,
  r2_storage_per_gb_month: 0.015,
  kv_reads_per_million: 0.50,
  kv_writes_per_million: 5.00,
  d1_reads_per_million: 0.001,
  d1_writes_per_million: 1.00,
} as const;

// All types must match the D1 schema columns exactly

export type Plan = 'free' | 'pro' | 'enterprise';
export type Role = 'admin' | 'editor' | 'viewer';
export type TeamMemberStatus = 'pending' | 'active';
export type CfTokenStatus = 'active' | 'revoked' | 'invalid';
export type ResourceType = 'zone' | 'worker' | 'r2_bucket' | 'kv_namespace' | 'd1_database';
export type MonitoringStatus = 'active' | 'paused';
export type RuleOperator = 'gt' | 'lt' | 'gte' | 'lte';
export type RuleWindow = '5m' | '1h' | '1d';
export type Severity = 'warning' | 'high' | 'critical';
export type NotifyFrequency = 'instant' | 'hourly' | 'daily';
export type DetectionType = 'threshold' | 'baseline' | 'velocity';
export type AnomalyStatus = 'active' | 'dismissed' | 'resolved';
export type NotificationType = 'anomaly' | 'budget' | 'billing' | 'system' | 'mitigation';
export type NotificationSeverity = 'info' | 'warning' | 'critical';
export type AlertChannel = 'email' | 'slack' | 'discord' | 'pagerduty' | 'teams' | 'webhook' | 'in_app';
export type AlertDeliveryStatus = 'sent' | 'failed' | 'skipped';
export type IntegrationType = 'slack' | 'discord' | 'pagerduty' | 'teams' | 'webhook';
export type IntegrationStatus = 'active' | 'inactive' | 'error';
export type MitigationTriggerType = 'traffic_rate' | 'error_spike' | 'cost_threshold';
export type MitigationActionType = 'rate_limit' | 'under_attack_mode' | 'block_ua' | 'pause_worker';
export type AuditAction = 'create' | 'update' | 'delete' | 'auth' | 'system';
export type AuditEntityType = 'rule' | 'integration' | 'mitigation' | 'team' | 'token' | 'settings' | 'resource' | 'anomaly';
export type BillingSnapshotStatus = 'active' | 'invoice';
export type MetricName = 'requests' | 'cost' | 'errors' | 'cpu_time' | 'bandwidth' | 'cached_requests' | 'bytes' | 'threats';

export interface User {
  id: string;
  email: string;
  email_verified: number; // 0 | 1 (SQLite boolean)
  password_hash: string | null;
  name: string;
  avatar_url: string | null;
  oauth_provider: string | null;
  oauth_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  name: string;
  plan: Plan;
  plan_period_end: string | null;
  stripe_customer_id: string | null;
  settings: string; // JSON: AccountSettings
  created_at: string;
  updated_at: string;
}

export interface AccountSettings {
  timezone?: string;
  default_notify_freq?: NotifyFrequency;
  budget_limit?: number;
}

export interface TeamMember {
  id: string;
  account_id: string;
  user_id: string | null;
  email: string;
  role: Role;
  status: TeamMemberStatus;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  last_active_at: string | null;
  created_at: string;
}

export interface CfToken {
  id: string;
  account_id: string;
  label: string;
  encrypted_token: string;
  cf_account_id: string | null;
  permissions: string; // JSON: string[]
  status: CfTokenStatus;
  last_used_at: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface Resource {
  id: string;
  account_id: string;
  cf_token_id: string;
  cf_resource_id: string;
  type: ResourceType;
  name: string;
  monitoring_status: MonitoringStatus;
  metadata: string; // JSON
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ZoneSnapshot {
  id: string;
  account_id: string;
  resource_id: string;
  timestamp: string;
  requests: number;
  cached_requests: number;
  bytes: number;
  threats: number;
  page_views: number;
  unique_visitors: number;
  estimated_cost: number;
  top_endpoints: string; // JSON
  top_countries: string; // JSON
  top_user_agents: string; // JSON
  created_at: string;
}

export interface Baseline {
  id: string;
  account_id: string;
  resource_id: string;
  metric: MetricName;
  hour_of_day: number;
  day_of_week: number;
  avg_value: number;
  stddev_value: number;
  sample_count: number;
  last_calculated: string;
  created_at: string;
  updated_at: string;
}

export interface Rule {
  id: string;
  account_id: string;
  name: string;
  resource_type: string;
  resource_id: string | null;
  metric: MetricName;
  operator: RuleOperator;
  threshold: number;
  window: RuleWindow;
  severity: Severity;
  notify_frequency: NotifyFrequency;
  enabled: number; // 0 | 1
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AnomalyAttribution {
  type: 'endpoint' | 'user_agent' | 'country' | 'asn' | 'service';
  value: string;
  contribution_pct: number;
  current_value: number;
  baseline_value: number;
}

export interface Anomaly {
  id: string;
  account_id: string;
  resource_id: string;
  rule_id: string | null;
  detection_type: DetectionType;
  metric: MetricName;
  severity: Severity;
  current_value: number;
  baseline_value: number | null;
  deviation: number | null;
  attribution: string; // JSON: AnomalyAttribution[]
  status: AnomalyStatus;
  dismissed_by: string | null;
  resolved_at: string | null;
  detected_at: string;
  created_at: string;
}

export interface Notification {
  id: string;
  account_id: string;
  user_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  severity: NotificationSeverity;
  link: string | null;
  read: number; // 0 | 1
  archived: number; // 0 | 1
  created_at: string;
}

export interface AlertDelivery {
  id: string;
  account_id: string;
  anomaly_id: string;
  channel: AlertChannel;
  integration_id: string | null;
  status: AlertDeliveryStatus;
  error_message: string | null;
  sent_at: string;
}

export interface Mitigation {
  id: string;
  account_id: string;
  name: string;
  trigger_type: MitigationTriggerType;
  trigger_condition: string; // JSON: { metric, operator, threshold }
  action_type: MitigationActionType;
  action_config: string; // JSON
  resource_id: string | null;
  enabled: number; // 0 | 1
  last_triggered: string | null;
  trigger_count: number;
  estimated_savings: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  account_id: string;
  type: IntegrationType;
  name: string;
  config: string; // JSON (encrypted webhook URLs)
  status: IntegrationStatus;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeveloperToken {
  id: string;
  account_id: string;
  user_id: string;
  name: string;
  token_hash: string;
  token_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  account_id: string;
  user_id: string | null;
  user_email: string | null;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string | null;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: string; // JSON
  created_at: string;
}

export interface BillingSnapshot {
  id: string;
  account_id: string;
  period_start: string;
  period_end: string;
  total_cost: number;
  breakdown: string; // JSON: Record<string, number>
  budget_limit: number | null;
  status: BillingSnapshotStatus;
  stripe_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

// Session context attached to Hono context after auth middleware
export interface SessionContext {
  user_id: string;
  account_id: string;
  role: Role;
  session_id: string;
}

// Pagination
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

import { z } from 'zod';

export const CreateRuleSchema = z.object({
  name: z.string().min(1).max(100),
  resource_type: z.enum(['zone', 'worker', 'r2_bucket', 'kv_namespace', 'd1_database', 'cdn', 'waf']),
  resource_id: z.string().optional().nullable(),
  metric: z.enum(['requests', 'cost', 'errors', 'cpu_time', 'bandwidth', 'cached_requests', 'bytes', 'threats']),
  operator: z.enum(['gt', 'lt', 'gte', 'lte']),
  threshold: z.number().positive(),
  window: z.enum(['5m', '1h', '1d']),
  severity: z.enum(['warning', 'high', 'critical']),
  notify_frequency: z.enum(['instant', 'hourly', 'daily']),
  enabled: z.boolean().default(true),
});

export const UpdateRuleSchema = CreateRuleSchema.partial().omit({ resource_type: true });

export type CreateRuleInput = z.infer<typeof CreateRuleSchema>;
export type UpdateRuleInput = z.infer<typeof UpdateRuleSchema>;

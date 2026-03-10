import { z } from 'zod';

export const MitigationTriggerConditionSchema = z.object({
	metric: z.string().min(1),
	operator: z.enum(['gt', 'lt', 'gte', 'lte']),
	threshold: z.number(),
});

export const RateLimitActionModeSchema = z.enum([
	'ban',
	'challenge',
	'js_challenge',
	'managed_challenge',
]);

export const RateLimitMitigationConfigSchema = z.object({
	zone_id: z.string().min(1),
	threshold: z.number().int().min(1),
	period: z.number().int().min(10),
	mitigation_timeout: z.number().int().min(10).optional(),
	url_pattern: z.string().min(1).optional(),
	action_mode: RateLimitActionModeSchema.optional(),
	dry_run: z.boolean().optional(),
});

export const UnderAttackMitigationConfigSchema = z.object({
	zone_id: z.string().min(1),
	security_level: z.enum(['under_attack', 'high', 'medium']).optional(),
	dry_run: z.boolean().optional(),
});

export const PauseWorkerMitigationConfigSchema = z.object({
	worker_name: z.string().min(1),
	dry_run: z.boolean().optional(),
});

export const CreateMitigationSchema = z.discriminatedUnion('action_type', [
	z.object({
		name: z.string().min(1).max(100),
		trigger_type: z.literal('traffic_rate'),
		trigger_condition: MitigationTriggerConditionSchema,
		action_type: z.literal('rate_limit'),
		action_config: RateLimitMitigationConfigSchema,
		resource_id: z.string().optional().nullable(),
	}),
	z.object({
		name: z.string().min(1).max(100),
		trigger_type: z.literal('traffic_rate'),
		trigger_condition: MitigationTriggerConditionSchema,
		action_type: z.literal('under_attack_mode'),
		action_config: UnderAttackMitigationConfigSchema,
		resource_id: z.string().optional().nullable(),
	}),
	z.object({
		name: z.string().min(1).max(100),
		trigger_type: z.literal('traffic_rate'),
		trigger_condition: MitigationTriggerConditionSchema,
		action_type: z.literal('pause_worker'),
		action_config: PauseWorkerMitigationConfigSchema,
		resource_id: z.string().optional().nullable(),
	}),
]);

export const UpdateMitigationSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	trigger_condition: MitigationTriggerConditionSchema.optional(),
	action_config: z
		.union([
			RateLimitMitigationConfigSchema,
			UnderAttackMitigationConfigSchema,
			PauseWorkerMitigationConfigSchema,
		])
		.optional(),
	resource_id: z.string().nullable().optional(),
});

export const TriggerMitigationSchema = z.object({
	confirm: z.boolean().default(false),
	dry_run: z.boolean().optional(),
});

export type CreateMitigationInput = z.infer<typeof CreateMitigationSchema>;
export type UpdateMitigationInput = z.infer<typeof UpdateMitigationSchema>;
export type TriggerMitigationInput = z.infer<typeof TriggerMitigationSchema>;
export type RateLimitMitigationConfig = z.infer<typeof RateLimitMitigationConfigSchema>;
export type UnderAttackMitigationConfig = z.infer<typeof UnderAttackMitigationConfigSchema>;
export type PauseWorkerMitigationConfig = z.infer<typeof PauseWorkerMitigationConfigSchema>;

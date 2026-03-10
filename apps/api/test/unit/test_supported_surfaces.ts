import { METRIC_NAMES } from '@flarelens/shared';
import { CreateMitigationSchema } from '@flarelens/shared/schemas/mitigations';
import { CreateRuleSchema } from '@flarelens/shared/schemas/rules';
import { describe, expect, it } from 'vitest';

describe('supported backend surfaces', () => {
	it('exposes only implemented detection metrics for rules', () => {
		expect(METRIC_NAMES).toEqual(['requests', 'cached_requests', 'bytes', 'threats']);

		const result = CreateRuleSchema.safeParse({
			name: 'Cost threshold',
			resource_type: 'zone',
			metric: 'cost',
			operator: 'gt',
			threshold: 100,
			window: '5m',
			severity: 'warning',
			notify_frequency: 'instant',
		});

		expect(result.success).toBe(false);
	});

	it('rejects unsupported mitigation trigger types', () => {
		const result = CreateMitigationSchema.safeParse({
			name: 'Budget breaker',
			trigger_type: 'cost_threshold',
			trigger_condition: { metric: 'requests', operator: 'gt', threshold: 1000 },
			action_type: 'rate_limit',
			action_config: {
				zone_id: 'zone_123',
				threshold: 500,
				period: 60,
			},
		});

		expect(result.success).toBe(false);
	});
});

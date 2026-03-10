import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../../src/env.js';
import { runDetection } from '../../src/services/detection/index.js';

describe('detection pipeline', () => {
	it('creates anomalies for supported non-request zone metrics', async () => {
		const anomalyCreate = vi.fn().mockResolvedValue(undefined);
		const alertSend = vi.fn().mockResolvedValue(undefined);

		const repos = {
			rules: {
				findEnabledByAccount: vi.fn().mockResolvedValue([
					{
						id: 'rule_bytes',
						resource_type: 'zone',
						resource_id: null,
						metric: 'bytes',
						severity: 'high',
						operator: 'gt',
						threshold: 5000,
						enabled: 1,
					},
				]),
			},
			baselines: {
				findByResourceMetric: vi.fn().mockResolvedValue({
					id: 'baseline_1',
					account_id: 'acct_detect',
					resource_id: 'resource_zone_1',
					metric: 'bytes',
					hour_of_day: 10,
					day_of_week: 2,
					avg_value: 2000,
					stddev_value: 500,
					sample_count: 10,
					last_calculated: new Date().toISOString(),
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				}),
			},
			anomalies: {
				findByResource: vi.fn().mockResolvedValue([]),
				create: anomalyCreate,
			},
			cfTokens: {
				findActiveByAccount: vi.fn().mockResolvedValue([]),
				findVerifiedByAccount: vi.fn().mockResolvedValue([]),
			},
			accounts: {
				findById: vi
					.fn()
					.mockResolvedValue({ settings: JSON.stringify({ auto_mitigation_enabled: false }) }),
			},
			mitigations: {
				findTriggerable: vi.fn(),
			},
		} as never;

		const env = {
			ALERT_DISPATCH_QUEUE: { send: alertSend },
		} as unknown as Env;

		await runDetection(
			{
				accountId: 'acct_detect',
				resourceId: 'resource_zone_1',
				resourceType: 'zone',
				metric: 'bytes',
				currentValue: 8000,
				recentValues: [1000, 2500, 8000],
				from: new Date('2026-03-11T10:00:00.000Z'),
				to: new Date('2026-03-11T10:05:00.000Z'),
			},
			repos,
			env,
		);

		expect(anomalyCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				metric: 'bytes',
				current_value: 8000,
				baseline_value: 2000,
			}),
		);
		expect(alertSend).toHaveBeenCalledTimes(1);
	});
});

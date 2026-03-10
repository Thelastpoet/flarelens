import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../../src/env.js';
import { runDetection } from '../../src/services/detection/index.js';

describe('detection auto-mitigation gate', () => {
	it('does not evaluate mitigations unless the account opts in', async () => {
		const mitigations = {
			findTriggerable: vi.fn(),
		};

		const repos = {
			rules: {
				findEnabledByAccount: vi.fn().mockResolvedValue([
					{
						id: 'rule_1',
						resource_type: 'zone',
						resource_id: null,
						metric: 'requests',
						severity: 'high',
						operator: 'gt',
						threshold: 100,
					},
				]),
			},
			baselines: {
				findByResourceMetric: vi.fn().mockResolvedValue(null),
			},
			anomalies: {
				findByResource: vi.fn().mockResolvedValue([]),
				create: vi.fn().mockResolvedValue(undefined),
			},
			cfTokens: {
				findActiveByAccount: vi.fn().mockResolvedValue([]),
				findVerifiedByAccount: vi.fn().mockResolvedValue([]),
			},
			accounts: {
				findById: vi.fn().mockResolvedValue({
					settings: JSON.stringify({ auto_mitigation_enabled: false }),
				}),
			},
			auditLogs: {
				create: vi.fn().mockResolvedValue(undefined),
			},
			mitigations,
		} as never;

		const env = {
			ALERT_DISPATCH_QUEUE: {
				send: vi.fn().mockResolvedValue(undefined),
			},
		} as unknown as Env;

		await runDetection(
			{
				accountId: 'acct_1',
				resourceId: 'resource_1',
				resourceType: 'zone',
				metric: 'requests',
				currentValue: 500,
				recentValues: [50, 75, 500],
				from: new Date('2026-03-10T10:00:00Z'),
				to: new Date('2026-03-10T10:05:00Z'),
			},
			repos,
			env,
		);

		expect(mitigations.findTriggerable).not.toHaveBeenCalled();
	});
});

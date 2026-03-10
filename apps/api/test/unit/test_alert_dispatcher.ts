import type { Anomaly, Integration } from '@flarelens/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptToken } from '../../src/auth/crypto.js';
import type { Env } from '../../src/env.js';
import { dispatchAlert } from '../../src/services/alerts/dispatcher.js';

function makeAnomaly(): Anomaly {
	return {
		id: 'anomaly_dispatch_1',
		account_id: 'acct_dispatch',
		resource_id: 'resource_dispatch',
		rule_id: 'rule_dispatch',
		detection_type: 'threshold',
		metric: 'requests',
		severity: 'high',
		current_value: 250,
		baseline_value: 25,
		deviation: 10,
		attribution: '[]',
		status: 'active',
		dismissed_by: null,
		resolved_at: null,
		detected_at: new Date().toISOString(),
		created_at: new Date().toISOString(),
	};
}

describe('alert dispatcher', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('writes an audit log when an external integration delivery fails', async () => {
		const tokenKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
		const integration: Integration = {
			id: 'integration_1',
			account_id: 'acct_dispatch',
			type: 'webhook',
			name: 'Failing webhook',
			config: JSON.stringify({
				encrypted_url: await encryptToken('https://example.com/fail', tokenKey),
			}),
			status: 'active',
			last_used_at: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				if (String(input) === 'https://example.com/fail') {
					return new Response('boom', { status: 500 });
				}
				throw new Error(`Unexpected fetch URL in dispatcher test: ${String(input)}`);
			}),
		);

		const auditCreate = vi.fn().mockResolvedValue(undefined);
		const repos = {
			teamMembers: {
				list: vi.fn().mockResolvedValue([]),
			},
			users: {
				findById: vi.fn().mockResolvedValue(null),
			},
			notifications: {
				create: vi.fn().mockResolvedValue(undefined),
			},
			integrations: {
				list: vi.fn().mockResolvedValue([integration]),
				markUsed: vi.fn().mockResolvedValue(undefined),
			},
			auditLogs: {
				create: auditCreate,
			},
			rules: {
				findById: vi.fn().mockResolvedValue({ notify_frequency: 'instant' }),
			},
		} as never;

		const env = {
			TOKEN_ENCRYPTION_KEY: tokenKey,
			RESEND_API_KEY: '',
			CACHE: {
				get: vi.fn().mockResolvedValue(null),
				put: vi.fn().mockResolvedValue(undefined),
			},
		} as unknown as Env;

		await dispatchAlert(makeAnomaly(), repos, env);

		expect(auditCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				entity_type: 'integration',
				entity_id: 'integration_1',
				description: 'Alert delivery failed for webhook integration "Failing webhook"',
				metadata: expect.objectContaining({
					outcome: 'failed',
					integration_type: 'webhook',
					anomaly_id: 'anomaly_dispatch_1',
				}),
			}),
		);
		expect(repos.integrations.markUsed).not.toHaveBeenCalled();
	});
});

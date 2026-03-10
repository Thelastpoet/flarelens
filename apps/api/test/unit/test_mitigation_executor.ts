import { ValidationError } from '@flarelens/shared';
import { describe, expect, it, vi } from 'vitest';
import { executeMitigation } from '../../src/services/mitigation/executor.js';

describe('mitigation executor', () => {
	it('rejects unsupported block_ua mitigations', async () => {
		await expect(
			executeMitigation({} as never, 'block_ua', { zone_id: 'zone_123', user_agent: 'BadBot/1.0' }),
		).rejects.toBeInstanceOf(ValidationError);
	});

	it('returns a dry-run result without mutating Cloudflare', async () => {
		const client = {
			createRateLimitRule: vi.fn(),
		};

		const result = await executeMitigation(client as never, 'rate_limit', {
			zone_id: 'zone_123',
			threshold: 250,
			period: 60,
		});

		expect(result.success).toBe(true);
		expect(result.dry_run).toBe(true);
		expect(result.executed).toBe(false);
		expect(result.provider_action).toBe('zone_rate_limit');
		expect(result.request).toMatchObject({
			zone_id: 'zone_123',
			threshold: 250,
			period: 60,
			action_mode: 'managed_challenge',
			url_pattern: '*',
		});
		expect(client.createRateLimitRule).not.toHaveBeenCalled();
	});

	it('uses a valid rate limit payload when execution is confirmed', async () => {
		const client = {
			createRateLimitRule: vi.fn().mockResolvedValue('rl_123'),
		};

		const result = await executeMitigation(client as never, 'rate_limit', {
			zone_id: 'zone_123',
			threshold: 500,
			period: 120,
			url_pattern: 'example.com/login*',
			action_mode: 'ban',
			mitigation_timeout: 600,
			dry_run: false,
		});

		expect(result.dry_run).toBe(false);
		expect(result.executed).toBe(true);
		expect(result.provider_reference).toBe('rl_123');
		expect(client.createRateLimitRule).toHaveBeenCalledWith('zone_123', {
			threshold: 500,
			period: 120,
			actionMode: 'ban',
			urlPattern: 'example.com/login*',
			mitigationTimeout: 600,
		});
	});
});

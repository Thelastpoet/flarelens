import type { BillingSnapshot, ZoneSnapshot } from '@flarelens/shared';
import { describe, expect, it } from 'vitest';
import {
	getBudgetLimitFromSettings,
	summarizeBillingFromSnapshot,
	summarizeBillingFromZoneSnapshots,
} from '../../src/services/billing.js';

function makeBillingSnapshot(): BillingSnapshot {
	return {
		id: 'bill_1',
		account_id: 'acct_1',
		period_start: '2026-03-01T00:00:00.000Z',
		period_end: '2026-03-31T23:59:59.000Z',
		total_cost: 120,
		breakdown: JSON.stringify({ workers: 70, cdn: 50 }),
		budget_limit: 200,
		status: 'active',
		stripe_invoice_id: null,
		created_at: '2026-03-10T00:00:00.000Z',
		updated_at: '2026-03-10T00:00:00.000Z',
	};
}

function makeZoneSnapshot(id: string, timestamp: string, estimatedCost: number): ZoneSnapshot {
	return {
		id,
		account_id: 'acct_1',
		resource_id: 'res_1',
		timestamp,
		requests: 0,
		cached_requests: 0,
		bytes: 0,
		threats: 0,
		page_views: 0,
		unique_visitors: 0,
		estimated_cost: estimatedCost,
		top_endpoints: '[]',
		top_countries: '[]',
		top_user_agents: '[]',
		created_at: timestamp,
	};
}

describe('billing estimation helpers', () => {
	it('reads budget limits from account settings', () => {
		expect(getBudgetLimitFromSettings({ budget_limit: 75 })).toBe(75);
		expect(getBudgetLimitFromSettings({})).toBeNull();
	});

	it('summarizes billing snapshots as non-estimated imported data', () => {
		const summary = summarizeBillingFromSnapshot(
			makeBillingSnapshot(),
			new Date('2026-03-11T00:00:00.000Z'),
		);

		expect(summary.source).toBe('billing_snapshot');
		expect(summary.is_estimated).toBe(false);
		expect(summary.current_estimated_spend).toBe(120);
		expect(summary.projected_monthly_estimated).toBe(360);
		expect(summary.breakdown).toEqual({ workers: 70, cdn: 50 });
	});

	it('summarizes zone snapshots as estimated spend when billing snapshots do not exist', () => {
		const summary = summarizeBillingFromZoneSnapshots(
			[
				makeZoneSnapshot('snap_1', '2026-03-01T00:00:00.000Z', 10),
				makeZoneSnapshot('snap_2', '2026-03-02T00:00:00.000Z', 20),
			],
			new Date('2026-03-03T00:00:00.000Z'),
		);

		expect(summary.source).toBe('estimated_snapshots');
		expect(summary.is_estimated).toBe(true);
		expect(summary.current_estimated_spend).toBe(30);
		expect(summary.daily_estimated_average).toBe(15);
		expect(summary.projected_monthly_estimated).toBe(450);
		expect(summary.breakdown).toEqual({ cdn_bandwidth_estimated: 30 });
	});
});

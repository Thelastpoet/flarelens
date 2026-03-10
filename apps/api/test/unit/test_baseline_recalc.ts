import type { Account, Resource, TeamMember } from '@flarelens/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { runBaselineRecalc } from '../../src/crons/baseline-recalc.js';
import { createTestEnv, FakeD1Database } from '../helpers/fakes.js';

const accountId = 'acct_baseline';
const resourceId = 'resource_zone_1';

function makeAccount(): Account {
	return {
		id: accountId,
		name: 'Baseline Account',
		plan: 'pro',
		plan_period_end: null,
		stripe_customer_id: null,
		settings: '{}',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

function makeMembership(): TeamMember {
	return {
		id: 'member_baseline',
		account_id: accountId,
		user_id: 'user_baseline',
		email: 'owner@example.com',
		role: 'admin',
		status: 'active',
		invited_by: 'user_baseline',
		invited_at: new Date().toISOString(),
		accepted_at: new Date().toISOString(),
		last_active_at: null,
		created_at: new Date().toISOString(),
	};
}

function makeResource(): Resource {
	return {
		id: resourceId,
		account_id: accountId,
		cf_token_id: 'cftok_baseline',
		cf_resource_id: 'zone_baseline',
		type: 'zone',
		name: 'example.com',
		monitoring_status: 'active',
		metadata: '{}',
		last_synced_at: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

describe('baseline recalculation', () => {
	let db: FakeD1Database;

	beforeEach(() => {
		db = new FakeD1Database();
		db.insertAccount(makeAccount());
		db.insertTeamMember(makeMembership());
		db.insertResource(makeResource());

		const timestamps = [
			'2026-02-10T10:00:00.000Z',
			'2026-02-17T10:00:00.000Z',
			'2026-02-24T10:00:00.000Z',
			'2026-03-03T10:00:00.000Z',
			'2026-03-10T10:00:00.000Z',
			'2026-02-10T11:00:00.000Z',
			'2026-02-17T11:00:00.000Z',
			'2026-02-24T11:00:00.000Z',
			'2026-03-03T11:00:00.000Z',
			'2026-03-10T11:00:00.000Z',
			'2026-02-10T12:00:00.000Z',
			'2026-02-17T12:00:00.000Z',
		];

		timestamps.forEach((timestamp, index) => {
			db.insertZoneSnapshot({
				id: `snap_${index}`,
				account_id: accountId,
				resource_id: resourceId,
				timestamp,
				requests: 100 + index,
				cached_requests: 40 + index,
				bytes: 1000 + index * 10,
				threats: 5 + (index % 3),
				page_views: 0,
				unique_visitors: 0,
				estimated_cost: 0.1,
				top_endpoints: '[]',
				top_countries: '[]',
				top_user_agents: '[]',
				created_at: timestamp,
			});
		});
	});

	it('recalculates baselines for requests, bytes, cached_requests, and threats', async () => {
		const env = createTestEnv({ DB: db });
		await runBaselineRecalc(env);

		const metrics = [...db.baselines.values()].map((baseline) => baseline.metric);
		expect(metrics).toEqual(
			expect.arrayContaining(['requests', 'bytes', 'cached_requests', 'threats']),
		);
	});
});

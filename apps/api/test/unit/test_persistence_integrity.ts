import { describe, expect, it } from 'vitest';
import { ResourcesRepository, ZoneSnapshotsRepository } from '@flarelens/db';
import { isDuplicate, markSent } from '../../src/services/alerts/dedup.js';
import { createTestEnv, FakeD1Database, FakeKVNamespace } from '../helpers/fakes.js';

describe('persistence integrity', () => {
	it('keeps Cloudflare resource identity type-aware during upserts', async () => {
		const db = new FakeD1Database();
		const repo = new ResourcesRepository(db, 'acct_resources');

		await repo.upsertFromCF({
			id: 'resource_zone',
			cf_token_id: 'cftok',
			cf_resource_id: 'shared_cf_id',
			type: 'zone',
			name: 'example.com',
		});
		await repo.upsertFromCF({
			id: 'resource_worker',
			cf_token_id: 'cftok',
			cf_resource_id: 'shared_cf_id',
			type: 'worker',
			name: 'worker-script',
		});

		const resources = [...db.resources.values()];
		expect(resources).toHaveLength(2);
		expect(resources.map((resource) => resource.type).sort()).toEqual(['worker', 'zone']);
	});

	it('upserts snapshots by resource and timestamp instead of inserting duplicates', async () => {
		const db = new FakeD1Database();
		const repo = new ZoneSnapshotsRepository(db, 'acct_snapshots');

		await repo.upsert({
			id: 'snapshot_1',
			resource_id: 'resource_zone',
			timestamp: '2026-03-10T10:00:00.000Z',
			requests: 100,
			cached_requests: 20,
			bytes: 1000,
			threats: 1,
			page_views: 5,
			unique_visitors: 0,
			estimated_cost: 0.1,
		});
		await repo.upsert({
			id: 'snapshot_2',
			resource_id: 'resource_zone',
			timestamp: '2026-03-10T10:00:00.000Z',
			requests: 150,
			cached_requests: 40,
			bytes: 1500,
			threats: 2,
			page_views: 7,
			unique_visitors: 0,
			estimated_cost: 0.2,
		});

		const snapshots = [...db.zoneSnapshots.values()];
		expect(snapshots).toHaveLength(1);
		expect(snapshots[0].requests).toBe(150);
		expect(snapshots[0].bytes).toBe(1500);
	});

	it('deduplicates alerts by metric and severity instead of only by resource', async () => {
		const env = createTestEnv({ CACHE: new FakeKVNamespace() });

		await markSent(env, 'acct_alerts', 'rule_1', 'resource_1', 'requests', 'high');

		expect(
			await isDuplicate(env, 'acct_alerts', 'rule_1', 'resource_1', 'requests', 'high'),
		).toBe(true);
		expect(
			await isDuplicate(env, 'acct_alerts', 'rule_1', 'resource_1', 'bytes', 'high'),
		).toBe(false);
		expect(
			await isDuplicate(env, 'acct_alerts', 'rule_1', 'resource_1', 'requests', 'critical'),
		).toBe(false);
	});
});

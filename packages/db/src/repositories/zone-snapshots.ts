import type { ZoneSnapshot } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class ZoneSnapshotsRepository extends BaseRepository {
	async upsert(data: {
		id: string;
		resource_id: string;
		timestamp: string;
		requests: number;
		cached_requests: number;
		bytes: number;
		threats: number;
		page_views: number;
		unique_visitors: number;
		estimated_cost: number;
		top_endpoints?: unknown[];
		top_countries?: unknown[];
		top_user_agents?: unknown[];
	}): Promise<void> {
		await this.run(
			`INSERT INTO zone_snapshots
       (id, account_id, resource_id, timestamp, requests, cached_requests, bytes,
        threats, page_views, unique_visitors, estimated_cost,
        top_endpoints, top_countries, top_user_agents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING`,
			data.id,
			this.account_id,
			data.resource_id,
			data.timestamp,
			data.requests,
			data.cached_requests,
			data.bytes,
			data.threats,
			data.page_views,
			data.unique_visitors,
			data.estimated_cost,
			JSON.stringify(data.top_endpoints ?? []),
			JSON.stringify(data.top_countries ?? []),
			JSON.stringify(data.top_user_agents ?? []),
		);
	}

	async getLatest(resource_id: string): Promise<ZoneSnapshot | null> {
		return this.first<ZoneSnapshot>(
			'SELECT * FROM zone_snapshots WHERE account_id = ? AND resource_id = ? ORDER BY timestamp DESC LIMIT 1',
			this.account_id,
			resource_id,
		);
	}

	async getTimeSeries(resource_id: string, from: string, to: string): Promise<ZoneSnapshot[]> {
		return this.all<ZoneSnapshot>(
			'SELECT * FROM zone_snapshots WHERE account_id = ? AND resource_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
			this.account_id,
			resource_id,
			from,
			to,
		);
	}

	async cleanupOld(retention_days: number): Promise<void> {
		await this.run(
			`DELETE FROM zone_snapshots
       WHERE account_id = ? AND timestamp < datetime('now', '-' || ? || ' days')`,
			this.account_id,
			retention_days,
		);
	}
}

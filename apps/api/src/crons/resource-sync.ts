import type { Env } from '../env.js';
import { CfTokensRepository, ResourcesRepository } from '@flarelens/db';
import { CloudflareClient } from '../services/cloudflare/client.js';
import { decryptToken } from '../auth/crypto.js';
import { newId } from '@flarelens/shared';

export async function runResourceSync(env: Env): Promise<void> {
	const DB = (env as unknown as { DB: D1Database }).DB;

	const accountRows = await DB.prepare(
		"SELECT DISTINCT account_id FROM team_members WHERE status = 'active'",
	).all<{ account_id: string }>();

	for (const { account_id } of accountRows.results ?? []) {
		try {
			await syncAccount(account_id, DB, env);
		} catch (err) {
			console.error(`[ResourceSync] Account ${account_id} failed:`, err);
		}
	}
}

async function syncAccount(accountId: string, DB: D1Database, env: Env): Promise<void> {
	const cfTokens = new CfTokensRepository(DB, accountId);
	const tokens = await cfTokens.findActiveByAccount();
	if (!tokens.length) return;

	const token = tokens[0];
	const plainToken = await decryptToken(token.encrypted_token, env.TOKEN_ENCRYPTION_KEY);
	const cfAccountId = token.cf_account_id ?? accountId;
	const client = new CloudflareClient(plainToken, cfAccountId);
	const resources = new ResourcesRepository(DB, accountId);

	const [zones, workers, r2Buckets, kvNamespaces, d1Databases] = await Promise.allSettled([
		client.listZones(),
		client.listWorkers(),
		client.listR2Buckets(),
		client.listKvNamespaces(),
		client.listD1Databases(),
	]);

	if (zones.status === 'fulfilled') {
		for (const z of zones.value) {
			await resources.upsertFromCF({ id: newId(), cf_token_id: token.id, cf_resource_id: z.id, type: 'zone', name: z.name, metadata: { status: z.status } });
		}
	}
	if (workers.status === 'fulfilled') {
		for (const w of workers.value) {
			await resources.upsertFromCF({ id: newId(), cf_token_id: token.id, cf_resource_id: w.id, type: 'worker', name: w.id, metadata: {} });
		}
	}
	if (r2Buckets.status === 'fulfilled') {
		for (const b of r2Buckets.value) {
			await resources.upsertFromCF({ id: newId(), cf_token_id: token.id, cf_resource_id: b.name, type: 'r2_bucket', name: b.name, metadata: {} });
		}
	}
	if (kvNamespaces.status === 'fulfilled') {
		for (const ns of kvNamespaces.value) {
			await resources.upsertFromCF({ id: newId(), cf_token_id: token.id, cf_resource_id: ns.id, type: 'kv_namespace', name: ns.title, metadata: {} });
		}
	}
	if (d1Databases.status === 'fulfilled') {
		for (const db of d1Databases.value) {
			await resources.upsertFromCF({ id: newId(), cf_token_id: token.id, cf_resource_id: db.uuid, type: 'd1_database', name: db.name, metadata: {} });
		}
	}

	await cfTokens.markUsed(token.id);
}

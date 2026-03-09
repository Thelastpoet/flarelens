import type { Env } from '../../env.js';
import { ALERT_DEDUP_TTL } from '@flarelens/shared';

function buildKey(
	accountId: string,
	ruleId: string | null,
	resourceId: string,
): string {
	return `alert_dedup:${accountId}:${ruleId ?? 'baseline'}:${resourceId}`;
}

export async function isDuplicate(
	env: Env,
	accountId: string,
	ruleId: string | null,
	resourceId: string,
	notifyFrequency: 'instant' | 'hourly' | 'daily' = 'instant',
): Promise<boolean> {
	const key = buildKey(accountId, ruleId, resourceId);
	const existing = await env.CACHE.get(key);
	return existing !== null;
}

export async function markSent(
	env: Env,
	accountId: string,
	ruleId: string | null,
	resourceId: string,
	notifyFrequency: 'instant' | 'hourly' | 'daily' = 'instant',
): Promise<void> {
	const key = buildKey(accountId, ruleId, resourceId);
	const ttl = ALERT_DEDUP_TTL[notifyFrequency] ?? ALERT_DEDUP_TTL['instant'];
	await env.CACHE.put(key, '1', { expirationTtl: ttl });
}

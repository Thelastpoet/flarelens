import { ALERT_DEDUP_TTL } from '@flarelens/shared';
import type { Env } from '../../env.js';

function buildKey(
	accountId: string,
	ruleId: string | null,
	resourceId: string,
	metric: string,
	severity: string,
): string {
	return `alert_dedup:${accountId}:${ruleId ?? 'baseline'}:${resourceId}:${metric}:${severity}`;
}

export async function isDuplicate(
	env: Env,
	accountId: string,
	ruleId: string | null,
	resourceId: string,
	metric: string,
	severity: string,
	_notifyFrequency: 'instant' | 'hourly' | 'daily' = 'instant',
): Promise<boolean> {
	const key = buildKey(accountId, ruleId, resourceId, metric, severity);
	const existing = await env.CACHE.get(key);
	return existing !== null;
}

export async function markSent(
	env: Env,
	accountId: string,
	ruleId: string | null,
	resourceId: string,
	metric: string,
	severity: string,
	notifyFrequency: 'instant' | 'hourly' | 'daily' = 'instant',
): Promise<void> {
	const key = buildKey(accountId, ruleId, resourceId, metric, severity);
	const ttl = ALERT_DEDUP_TTL[notifyFrequency] ?? ALERT_DEDUP_TTL.instant;
	await env.CACHE.put(key, '1', { expirationTtl: ttl });
}

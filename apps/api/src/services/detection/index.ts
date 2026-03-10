import type { AccountSettings, Severity } from '@flarelens/shared';
import { newId } from '@flarelens/shared';
import type { Repos } from '../../middleware/repos.js';
import type { Env } from '../../env.js';
import { decryptToken } from '../../auth/crypto.js';
import { CloudflareClient } from '../cloudflare/client.js';
import { evaluateThresholds } from './threshold.js';
import { evaluateBaseline } from './baseline.js';
import { evaluateVelocity } from './velocity.js';
import { analyzeAttribution } from './attribution.js';

export interface DetectionInput {
	accountId: string;
	resourceId: string;
	resourceType: string; // 'zone' | 'worker' | etc.
	zoneId?: string; // CF zone ID for attribution queries
	metric: string; // e.g. 'requests'
	currentValue: number;
	recentValues: number[]; // last 5 values for velocity
	from: Date;
	to: Date;
}

function highestSeverity(severities: Array<Severity | 'normal' | null | undefined>): Severity | null {
	const order: Record<string, number> = { critical: 3, high: 2, warning: 1, normal: 0 };
	let best: Severity | null = null;
	let bestScore = -1;

	for (const s of severities) {
		if (!s || s === 'normal') continue;
		const score = order[s] ?? -1;
		if (score > bestScore) {
			bestScore = score;
			best = s as Severity;
		}
	}

	return best;
}

export async function runDetection(
	input: DetectionInput,
	repos: Repos,
	env: Env,
): Promise<void> {
	const { accountId, resourceId, resourceType, zoneId, metric, currentValue, recentValues, from, to } =
		input;

	// 1. Get enabled rules for this resource type + metric
	const allRules = await repos.rules.findEnabledByAccount();
	const relevantRules = allRules.filter(
		(r) =>
			r.resource_type === resourceType &&
			r.metric === metric &&
			(r.resource_id === null || r.resource_id === resourceId),
	);

	// 2. Run threshold detector
	const thresholdMatches = evaluateThresholds(relevantRules, currentValue, metric);
	const triggeredThresholds = thresholdMatches.filter((m) => m.triggered);

	// 3. Get baseline from repos
	const now = from;
	const hourOfDay = now.getUTCHours();
	const dayOfWeek = now.getUTCDay();
	const baseline = await repos.baselines.findByResourceMetric(
		resourceId,
		metric,
		hourOfDay,
		dayOfWeek,
	);

	// 4. Run baseline detector if baseline exists
	const baselineResult = baseline ? evaluateBaseline(currentValue, baseline) : null;

	// 5. Run velocity detector on recentValues
	const velocityResult = recentValues.length >= 3 ? evaluateVelocity(recentValues) : null;

	// 6. Determine highest severity across all triggered detections
	const severityCandidates: Array<Severity | 'normal' | null | undefined> = [
		...triggeredThresholds.map((t) => t.rule.severity as Severity),
		baselineResult?.severity,
		velocityResult?.severity,
	];

	const topSeverity = highestSeverity(severityCandidates);

	// If nothing triggered, exit early
	if (!topSeverity && triggeredThresholds.length === 0 && !baselineResult?.severity && !velocityResult?.severity) {
		return;
	}

	const finalSeverity: Severity = topSeverity ?? 'warning';

	// Dedup: skip if anomaly already exists in the last hour for this resource+metric
	const recentAnomalies = await repos.anomalies.findByResource(resourceId, 10);
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
	const alreadyExists = recentAnomalies.some(
		(a) =>
			a.metric === metric &&
			a.status === 'active' &&
			a.detected_at >= oneHourAgo,
	);

	if (alreadyExists) {
		return;
	}

	// 7. Run attribution analysis (best-effort)
	let attributionContributors: unknown[] = [];
	if (zoneId) {
		try {
			const cfTokens = await repos.cfTokens.findActiveByAccount();
			if (cfTokens.length > 0) {
				const firstToken = cfTokens[0];
				const plainToken = await decryptToken(firstToken.encrypted_token, env.TOKEN_ENCRYPTION_KEY);
				const cfAccountId = firstToken.cf_account_id ?? accountId;
				const client = new CloudflareClient(plainToken, cfAccountId);
				const attribution = await analyzeAttribution(client, zoneId, from, to, currentValue);
				attributionContributors = attribution.contributors.map((c) => ({
					type: c.type,
					value: c.value,
					contribution_pct: c.contributionPct,
					current_value: c.requests,
					baseline_value: c.baselineRequests ?? 0,
				}));
			}
		} catch (err) {
			console.error('[Detection] Attribution analysis failed:', err);
		}
	}

	// Create anomaly record
	const anomalyId = newId();
	const triggeredRule = triggeredThresholds[0]?.rule ?? null;
	let detectionType: 'threshold' | 'baseline' | 'velocity' = 'threshold';
	if (triggeredThresholds.length > 0) {
		detectionType = 'threshold';
	} else if (baselineResult?.severity && baselineResult.severity !== 'normal') {
		detectionType = 'baseline';
	} else {
		detectionType = 'velocity';
	}

	await repos.anomalies.create({
		id: anomalyId,
		resource_id: resourceId,
		rule_id: triggeredRule?.id ?? null,
		detection_type: detectionType,
		metric,
		severity: finalSeverity,
		current_value: currentValue,
		baseline_value: baseline?.avg_value ?? null,
		deviation: baselineResult?.deviation ?? null,
		attribution: attributionContributors,
	});

	// 8. Enqueue alert dispatch
	await env.ALERT_DISPATCH_QUEUE.send({
		anomaly_id: anomalyId,
		account_id: accountId,
	});

	// 9. Check active mitigations and auto-trigger if condition matches
	try {
		const account = await repos.accounts.findById();
		const accountSettings = account?.settings
			? (JSON.parse(account.settings) as AccountSettings)
			: {};
		if (accountSettings.auto_mitigation_enabled !== true) {
			return;
		}

		const activeMitigations = await repos.mitigations.findTriggerable();
		for (const m of activeMitigations) {
			const condition = JSON.parse(m.trigger_condition) as { metric: string; operator: string; threshold: number };
			if (condition.metric !== metric) continue;
			const triggered =
				(condition.operator === 'gt' && currentValue > condition.threshold) ||
				(condition.operator === 'gte' && currentValue >= condition.threshold) ||
				(condition.operator === 'lt' && currentValue < condition.threshold) ||
				(condition.operator === 'lte' && currentValue <= condition.threshold);

			if (!triggered) continue;

			try {
				const { executeMitigation } = await import('../mitigation/executor.js');
				const cfTokens = await repos.cfTokens.findVerifiedByAccount();
				if (!cfTokens.length) continue;
				const { decryptToken: dt } = await import('../../auth/crypto.js');
				const plainToken = await dt(cfTokens[0].encrypted_token, env.TOKEN_ENCRYPTION_KEY);
				const cfAccountId = cfTokens[0].cf_account_id ?? accountId;
				const { CloudflareClient: CFC } = await import('../cloudflare/client.js');
				const client = new CFC(plainToken, cfAccountId);
				const actionConfig = JSON.parse(m.action_config) as Record<string, unknown>;
				const result = await executeMitigation(
					client,
					m.action_type as import('../mitigation/executor.js').ActionType,
					actionConfig,
				);
				if (result.executed) {
					await repos.mitigations.recordTrigger(m.id, 0);
				}
				await repos.auditLogs.create({
					id: newId(),
					action: 'system',
					entity_type: 'mitigation',
					entity_id: m.id,
					description: `Auto-triggered mitigation "${m.name}" for anomaly ${anomalyId}: ${result.detail}`,
					metadata: {
						anomaly_id: anomalyId,
						dry_run: result.dry_run,
						executed: result.executed,
						provider_action: result.provider_action,
						provider_reference: result.provider_reference,
						request: result.request,
						response: result.response,
					},
				});
				console.log(`[Detection] Auto-triggered mitigation "${m.name}" for anomaly ${anomalyId}`);
			} catch (err) {
				await repos.auditLogs.create({
					id: newId(),
					action: 'system',
					entity_type: 'mitigation',
					entity_id: m.id,
					description: `Mitigation "${m.name}" failed during auto-trigger`,
					metadata: {
						anomaly_id: anomalyId,
						error: err instanceof Error ? err.message : 'Unknown mitigation error',
					},
				});
				console.error(`[Detection] Mitigation "${m.name}" execution failed:`, err);
			}
		}
	} catch (err) {
		console.error('[Detection] Mitigation check failed:', err);
	}
}

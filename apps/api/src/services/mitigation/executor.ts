import { CloudflareClient } from '../cloudflare/client.js';

export interface MitigationActionConfig {
	zone_id?: string;
	worker_name?: string;
	// rate_limit
	threshold?: number;
	period?: number; // seconds
	// block_ua
	user_agent?: string;
	// under_attack_mode
	security_level?: 'under_attack' | 'high' | 'medium';
}

export type ActionType = 'rate_limit' | 'under_attack_mode' | 'block_ua' | 'pause_worker';

export async function executeMitigation(
	client: CloudflareClient,
	actionType: ActionType,
	config: MitigationActionConfig,
): Promise<{ success: boolean; detail?: string }> {
	switch (actionType) {
		case 'under_attack_mode': {
			if (!config.zone_id) throw new Error('under_attack_mode requires zone_id');
			await client.setZoneSecurityLevel(
				config.zone_id,
				config.security_level ?? 'under_attack',
			);
			return { success: true, detail: `Set zone ${config.zone_id} to ${config.security_level ?? 'under_attack'} mode` };
		}

		case 'rate_limit': {
			if (!config.zone_id) throw new Error('rate_limit requires zone_id');
			const ruleId = await client.createRateLimitRule(config.zone_id, {
				threshold: config.threshold ?? 1000,
				period: config.period ?? 60,
			});
			return { success: true, detail: `Created rate limit rule ${ruleId} on zone ${config.zone_id}` };
		}

		case 'block_ua': {
			if (!config.zone_id || !config.user_agent) throw new Error('block_ua requires zone_id and user_agent');
			await client.blockUserAgent(config.zone_id, config.user_agent);
			return { success: true, detail: `Blocked user-agent "${config.user_agent}" on zone ${config.zone_id}` };
		}

		case 'pause_worker': {
			if (!config.worker_name) throw new Error('pause_worker requires worker_name');
			await client.disableWorkerSubdomain(config.worker_name);
			return { success: true, detail: `Disabled subdomain for worker "${config.worker_name}"` };
		}

		default:
			throw new Error(`Unknown action type: ${actionType}`);
	}
}

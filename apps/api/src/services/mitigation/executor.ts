import {
	ValidationError,
	type MitigationActionType,
} from '@flarelens/shared';
import {
	PauseWorkerMitigationConfigSchema,
	RateLimitMitigationConfigSchema,
	UnderAttackMitigationConfigSchema,
	type PauseWorkerMitigationConfig,
	type RateLimitMitigationConfig,
	type UnderAttackMitigationConfig,
} from '@flarelens/shared/schemas/mitigations';
import { CloudflareClient } from '../cloudflare/client.js';

export type MitigationActionConfig =
	| RateLimitMitigationConfig
	| UnderAttackMitigationConfig
	| PauseWorkerMitigationConfig
	| Record<string, unknown>;

export type ActionType = MitigationActionType;

export interface MitigationExecutionResult {
	success: boolean;
	detail: string;
	dry_run: boolean;
	executed: boolean;
	provider_action: string;
	provider_reference: string | null;
	request: Record<string, unknown>;
	response: Record<string, unknown>;
}

export async function executeMitigation(
	client: CloudflareClient,
	actionType: ActionType,
	config: MitigationActionConfig,
	options: { dryRun?: boolean } = {},
): Promise<MitigationExecutionResult> {
	switch (actionType) {
		case 'under_attack_mode': {
			const parsedConfig = UnderAttackMitigationConfigSchema.parse(config);
			const dryRun = options.dryRun ?? parsedConfig.dry_run ?? true;
			const securityLevel = parsedConfig.security_level ?? 'under_attack';
			const request = { zone_id: parsedConfig.zone_id, security_level: securityLevel };
			if (dryRun) {
				return {
					success: true,
					detail: `Dry run: would set zone ${parsedConfig.zone_id} to ${securityLevel}`,
					dry_run: true,
					executed: false,
					provider_action: 'zone_security_level',
					provider_reference: null,
					request,
					response: { simulated: true },
				};
			}

			await client.setZoneSecurityLevel(parsedConfig.zone_id, securityLevel);
			return {
				success: true,
				detail: `Set zone ${parsedConfig.zone_id} to ${securityLevel}`,
				dry_run: false,
				executed: true,
				provider_action: 'zone_security_level',
				provider_reference: parsedConfig.zone_id,
				request,
				response: { status: 'updated' },
			};
		}

		case 'rate_limit': {
			const parsedConfig = RateLimitMitigationConfigSchema.parse(config);
			const dryRun = options.dryRun ?? parsedConfig.dry_run ?? true;
			const actionMode = parsedConfig.action_mode ?? 'managed_challenge';
			const request = {
				zone_id: parsedConfig.zone_id,
				threshold: parsedConfig.threshold,
				period: parsedConfig.period,
				action_mode: actionMode,
				url_pattern: parsedConfig.url_pattern ?? '*',
				mitigation_timeout: parsedConfig.mitigation_timeout ?? null,
			};
			if (dryRun) {
				return {
					success: true,
					detail: `Dry run: would create a ${actionMode} rate limit on zone ${parsedConfig.zone_id}`,
					dry_run: true,
					executed: false,
					provider_action: 'zone_rate_limit',
					provider_reference: null,
					request,
					response: { simulated: true },
				};
			}

			const ruleId = await client.createRateLimitRule(parsedConfig.zone_id, {
				threshold: parsedConfig.threshold,
				period: parsedConfig.period,
				actionMode,
				urlPattern: parsedConfig.url_pattern,
				mitigationTimeout: parsedConfig.mitigation_timeout,
			});
			return {
				success: true,
				detail: `Created rate limit rule ${ruleId} on zone ${parsedConfig.zone_id}`,
				dry_run: false,
				executed: true,
				provider_action: 'zone_rate_limit',
				provider_reference: ruleId,
				request,
				response: { rule_id: ruleId },
			};
		}

		case 'pause_worker': {
			const parsedConfig = PauseWorkerMitigationConfigSchema.parse(config);
			const dryRun = options.dryRun ?? parsedConfig.dry_run ?? true;
			const request = { worker_name: parsedConfig.worker_name };
			if (dryRun) {
				return {
					success: true,
					detail: `Dry run: would disable subdomain for worker "${parsedConfig.worker_name}"`,
					dry_run: true,
					executed: false,
					provider_action: 'worker_subdomain_disable',
					provider_reference: null,
					request,
					response: { simulated: true },
				};
			}

			await client.disableWorkerSubdomain(parsedConfig.worker_name);
			return {
				success: true,
				detail: `Disabled subdomain for worker "${parsedConfig.worker_name}"`,
				dry_run: false,
				executed: true,
				provider_action: 'worker_subdomain_disable',
				provider_reference: parsedConfig.worker_name,
				request,
				response: { status: 'updated' },
			};
		}

		case 'block_ua':
			throw new ValidationError(
				'block_ua mitigations are disabled because the current Cloudflare API integration is not valid for user-agent blocking',
			);
		default:
			throw new ValidationError(`Unknown action type: ${actionType}`);
	}
}

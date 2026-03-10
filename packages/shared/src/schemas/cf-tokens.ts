import { z } from 'zod';
import {
	CF_CAPABILITIES,
	CF_REQUIRED_CAPABILITIES,
	type CfAccountSource,
} from '../types.js';

export const AddCfTokenSchema = z.object({
	label: z.string().min(1).max(100),
	token: z.string().min(10).max(500),
});

export type AddCfTokenInput = z.infer<typeof AddCfTokenSchema>;

export const CfCapabilitySchema = z.enum(CF_CAPABILITIES);
export const CfRequiredCapabilitySchema = z.enum(CF_REQUIRED_CAPABILITIES);
export const CfAccountSourceSchema = z.enum(['stored', 'accounts_list', 'memberships'] satisfies [
	CfAccountSource,
	...CfAccountSource[],
]);

export const CfCapabilityProbeSchema = z.object({
	capability: CfCapabilitySchema,
	ok: z.boolean(),
	detail: z.string().nullable(),
});

export const CfTokenVerificationDetailsSchema = z.object({
	token_id: z.string().nullable(),
	token_status: z.string().nullable(),
	expires_on: z.string().nullable(),
	not_before: z.string().nullable(),
	account_id: z.string().nullable(),
	account_name: z.string().nullable(),
	account_source: CfAccountSourceSchema.nullable(),
	probes: z.array(CfCapabilityProbeSchema),
	checked_at: z.string(),
});

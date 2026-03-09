import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional().nullable(),
});

export const UpdateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: z.object({
    timezone: z.string().optional(),
    default_notify_freq: z.enum(['instant', 'hourly', 'daily']).optional(),
    budget_limit: z.number().positive().optional().nullable(),
  }).optional(),
});

export const UpdateNotificationPrefsSchema = z.object({
  email_enabled: z.boolean().optional(),
  email_min_severity: z.enum(['warning', 'high', 'critical']).optional(),
  digest_enabled: z.boolean().optional(),
  digest_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  in_app_enabled: z.boolean().optional(),
});

export const InviteTeamMemberSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(['admin', 'editor', 'viewer']),
});

export const UpdateTeamMemberRoleSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']),
});

export const CreateDeveloperTokenSchema = z.object({
  name: z.string().min(1).max(100),
  expires_at: z.string().datetime().optional().nullable(),
});

export const UpdateBudgetSchema = z.object({
  budget_limit: z.number().positive().nullable(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;
export type UpdateNotificationPrefsInput = z.infer<typeof UpdateNotificationPrefsSchema>;
export type InviteTeamMemberInput = z.infer<typeof InviteTeamMemberSchema>;
export type UpdateTeamMemberRoleInput = z.infer<typeof UpdateTeamMemberRoleSchema>;
export type CreateDeveloperTokenInput = z.infer<typeof CreateDeveloperTokenSchema>;
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetSchema>;

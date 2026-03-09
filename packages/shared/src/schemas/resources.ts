import { z } from 'zod';

export const UpdateResourceSchema = z.object({
	monitoring_status: z.enum(['active', 'paused']),
});

export type UpdateResourceInput = z.infer<typeof UpdateResourceSchema>;

import { z } from 'zod';

export const AddCfTokenSchema = z.object({
  label: z.string().min(1).max(100),
  token: z.string().min(10).max(500),
});

export type AddCfTokenInput = z.infer<typeof AddCfTokenSchema>;

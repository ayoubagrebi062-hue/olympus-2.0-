/**
 * OLYMPUS 2.0 - Cron Agent Output Schema (stub)
 */
import { z } from 'zod';

export const CronOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type CronOutput = z.infer<typeof CronOutputSchema>;

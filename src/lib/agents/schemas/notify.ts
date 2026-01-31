/**
 * OLYMPUS 2.0 - Notify Agent Output Schema (stub)
 */
import { z } from 'zod';

export const NotifyOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type NotifyOutput = z.infer<typeof NotifyOutputSchema>;

/**
 * OLYMPUS 2.0 - Sync Agent Output Schema (stub)
 */
import { z } from 'zod';

export const SyncOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type SyncOutput = z.infer<typeof SyncOutputSchema>;

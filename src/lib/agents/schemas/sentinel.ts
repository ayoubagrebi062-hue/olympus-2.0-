/**
 * OLYMPUS 2.0 - Sentinel Agent Output Schema (stub)
 */
import { z } from 'zod';

export const SentinelOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type SentinelOutput = z.infer<typeof SentinelOutputSchema>;

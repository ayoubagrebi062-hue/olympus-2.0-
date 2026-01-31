/**
 * OLYMPUS 2.0 - Blocks Agent Output Schema (stub)
 */
import { z } from 'zod';

export const BlocksOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type BlocksOutput = z.infer<typeof BlocksOutputSchema>;

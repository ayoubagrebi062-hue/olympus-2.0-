/**
 * OLYMPUS 2.0 - Junit Agent Output Schema (stub)
 */
import { z } from 'zod';

export const JunitOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type JunitOutput = z.infer<typeof JunitOutputSchema>;

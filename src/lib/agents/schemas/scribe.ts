/**
 * OLYMPUS 2.0 - Scribe Agent Output Schema (stub)
 */
import { z } from 'zod';

export const ScribeOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type ScribeOutput = z.infer<typeof ScribeOutputSchema>;

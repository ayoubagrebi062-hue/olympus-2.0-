/**
 * OLYMPUS 2.0 - Load Agent Output Schema (stub)
 */
import { z } from 'zod';

export const LoadOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type LoadOutput = z.infer<typeof LoadOutputSchema>;

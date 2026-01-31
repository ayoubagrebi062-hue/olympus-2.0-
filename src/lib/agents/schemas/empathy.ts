/**
 * OLYMPUS 2.0 - Empathy Agent Output Schema (stub)
 */
import { z } from 'zod';

export const EmpathyOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type EmpathyOutput = z.infer<typeof EmpathyOutputSchema>;

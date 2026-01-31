/**
 * OLYMPUS 2.0 - Scope Agent Output Schema (stub)
 */
import { z } from 'zod';

export const ScopeOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type ScopeOutput = z.infer<typeof ScopeOutputSchema>;

/**
 * OLYMPUS 2.0 - Cypress Agent Output Schema (stub)
 */
import { z } from 'zod';

export const CypressOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type CypressOutput = z.infer<typeof CypressOutputSchema>;

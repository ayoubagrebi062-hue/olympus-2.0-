/**
 * OLYMPUS 2.0 - A11y Agent Output Schema (stub)
 */
import { z } from 'zod';

export const A11yOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type A11yOutput = z.infer<typeof A11yOutputSchema>;

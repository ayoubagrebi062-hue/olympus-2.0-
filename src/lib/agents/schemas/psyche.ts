/**
 * OLYMPUS 2.0 - Psyche Agent Output Schema (stub)
 */
import { z } from 'zod';

export const PsycheOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type PsycheOutput = z.infer<typeof PsycheOutputSchema>;

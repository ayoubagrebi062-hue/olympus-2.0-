/**
 * OLYMPUS 2.0 - Venture Agent Output Schema (stub)
 */
import { z } from 'zod';

export const VentureOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type VentureOutput = z.infer<typeof VentureOutputSchema>;

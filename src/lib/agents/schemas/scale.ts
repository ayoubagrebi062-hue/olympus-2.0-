/**
 * OLYMPUS 2.0 - Scale Agent Output Schema (stub)
 */
import { z } from 'zod';

export const ScaleOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type ScaleOutput = z.infer<typeof ScaleOutputSchema>;

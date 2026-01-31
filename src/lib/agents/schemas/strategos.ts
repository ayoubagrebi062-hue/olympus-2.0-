/**
 * OLYMPUS 2.0 - Strategos Agent Output Schema (stub)
 */
import { z } from 'zod';

export const StrategosOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type StrategosOutput = z.infer<typeof StrategosOutputSchema>;

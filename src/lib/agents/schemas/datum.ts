/**
 * OLYMPUS 2.0 - Datum Agent Output Schema (stub)
 */
import { z } from 'zod';

export const DatumOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type DatumOutput = z.infer<typeof DatumOutputSchema>;

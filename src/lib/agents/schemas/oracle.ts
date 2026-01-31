/**
 * OLYMPUS 2.0 - Oracle Agent Output Schema (stub)
 */
import { z } from 'zod';

export const OracleOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type OracleOutput = z.infer<typeof OracleOutputSchema>;

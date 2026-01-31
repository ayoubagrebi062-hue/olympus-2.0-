/**
 * OLYMPUS 2.0 - Engine Agent Output Schema (stub)
 */
import { z } from 'zod';

export const EngineOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type EngineOutput = z.infer<typeof EngineOutputSchema>;

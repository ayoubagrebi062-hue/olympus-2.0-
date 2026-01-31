/**
 * OLYMPUS 2.0 - Forge Agent Output Schema (stub)
 */
import { z } from 'zod';

export const ForgeOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type ForgeOutput = z.infer<typeof ForgeOutputSchema>;

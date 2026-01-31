/**
 * OLYMPUS 2.0 - Archon Agent Output Schema (stub)
 */
import { z } from 'zod';

export const ArchonOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type ArchonOutput = z.infer<typeof ArchonOutputSchema>;

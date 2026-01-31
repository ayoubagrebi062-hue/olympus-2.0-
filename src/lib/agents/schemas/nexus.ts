/**
 * OLYMPUS 2.0 - Nexus Agent Output Schema (stub)
 */
import { z } from 'zod';

export const NexusOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type NexusOutput = z.infer<typeof NexusOutputSchema>;

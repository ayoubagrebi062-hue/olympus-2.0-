/**
 * OLYMPUS 2.0 - Bridge Agent Output Schema (stub)
 */
import { z } from 'zod';

export const BridgeOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type BridgeOutput = z.infer<typeof BridgeOutputSchema>;

/**
 * OLYMPUS 2.0 - Flow Agent Output Schema (stub)
 */
import { z } from 'zod';

export const FlowOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type FlowOutput = z.infer<typeof FlowOutputSchema>;

/**
 * OLYMPUS 2.0 - Pipeline Agent Output Schema (stub)
 */
import { z } from 'zod';

export const PipelineOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type PipelineOutput = z.infer<typeof PipelineOutputSchema>;

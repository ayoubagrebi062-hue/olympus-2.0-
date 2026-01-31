/**
 * OLYMPUS 2.0 - Grid Agent Output Schema (stub)
 */
import { z } from 'zod';

export const GridOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type GridOutput = z.infer<typeof GridOutputSchema>;

/**
 * OLYMPUS 2.0 - Monitor Agent Output Schema (stub)
 */
import { z } from 'zod';

export const MonitorOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type MonitorOutput = z.infer<typeof MonitorOutputSchema>;

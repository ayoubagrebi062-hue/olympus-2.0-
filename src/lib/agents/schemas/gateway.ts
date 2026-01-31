/**
 * OLYMPUS 2.0 - Gateway Agent Output Schema (stub)
 */
import { z } from 'zod';

export const GatewayOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type GatewayOutput = z.infer<typeof GatewayOutputSchema>;

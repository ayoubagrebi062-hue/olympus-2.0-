/**
 * OLYMPUS 2.0 - Atlas Agent Output Schema (stub)
 */
import { z } from 'zod';

export const AtlasOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type AtlasOutput = z.infer<typeof AtlasOutputSchema>;

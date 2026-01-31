/**
 * OLYMPUS 2.0 - ArchitectConversion Agent Output Schema (stub)
 */
import { z } from 'zod';

export const ArchitectConversionOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type ArchitectConversionOutput = z.infer<typeof ArchitectConversionOutputSchema>;

/**
 * OLYMPUS 2.0 - Palette Agent Output Schema (stub)
 */
import { z } from 'zod';

export const PaletteOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type PaletteOutput = z.infer<typeof PaletteOutputSchema>;

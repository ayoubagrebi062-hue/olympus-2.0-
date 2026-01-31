/**
 * OLYMPUS 2.0 - Artist Agent Output Schema (stub)
 */
import { z } from 'zod';

export const ArtistOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type ArtistOutput = z.infer<typeof ArtistOutputSchema>;

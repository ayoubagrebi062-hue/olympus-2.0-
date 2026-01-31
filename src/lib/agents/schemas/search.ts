/**
 * OLYMPUS 2.0 - Search Agent Output Schema (stub)
 */
import { z } from 'zod';

export const SearchOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type SearchOutput = z.infer<typeof SearchOutputSchema>;

/**
 * OLYMPUS 2.0 - Cartographer Agent Output Schema (stub)
 */
import { z } from 'zod';

export const CartographerOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type CartographerOutput = z.infer<typeof CartographerOutputSchema>;

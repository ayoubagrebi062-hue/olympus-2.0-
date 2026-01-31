/**
 * OLYMPUS 2.0 - Keeper Agent Output Schema (stub)
 */
import { z } from 'zod';

export const KeeperOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type KeeperOutput = z.infer<typeof KeeperOutputSchema>;

/**
 * OLYMPUS 2.0 - Docker Agent Output Schema (stub)
 */
import { z } from 'zod';

export const DockerOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type DockerOutput = z.infer<typeof DockerOutputSchema>;

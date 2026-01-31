/**
 * OLYMPUS 2.0 - ConversionJudge Agent Output Schema (stub)
 */
import { z } from 'zod';

export const ConversionJudgeOutputSchema = z.object({
  rationale: z.string().min(1),
});
export type ConversionJudgeOutput = z.infer<typeof ConversionJudgeOutputSchema>;

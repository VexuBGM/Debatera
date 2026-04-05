import { z } from 'zod';

export const judgeFeedbackSchema = z.object({
  debateJudgeId: z.string().min(1),
  clarityRating: z.int().min(1).max(5),
  fairnessRating: z.int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export type JudgeFeedbackInput = z.infer<typeof judgeFeedbackSchema>;

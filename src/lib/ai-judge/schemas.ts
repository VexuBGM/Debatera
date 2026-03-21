import { z } from "zod";

// Session creation
export const createSessionSchema = z.object({
  motion: z.string().min(1, "Motion is required"),
  transcriptText: z.string().min(1, "Transcript text is required"),
  infoSlide: z.string().optional(),
  debateId: z.string().optional(),
});

// Upload transcript
export const uploadTranscriptSchema = z.object({
  fileContent: z.string().min(1, "File content is required"),
  fileName: z.string().min(1, "File name is required"),
});

// Debate context (Phase 1 output)
export const debateContextSchema = z.object({
  motion: z.string(),
  coreIssues: z.array(z.string()),
  reasonableDefinition: z.string(),
  propBurdens: z.array(z.string()),
  oppBurdens: z.array(z.string()),
  judgingFramework: z.string(),
});

// Speech analysis (Phase 2 output per speech per lens)
export const speechAnalysisSchema = z.object({
  speechIndex: z.number(),
  role: z.string(),
  side: z.enum(["PROP", "OPP"]),
  analysis: z.record(z.string(), z.unknown()),
  score: z.number().min(0).max(80),
  memory: z.string(),
});

// Lens verdict (Phase 3 output)
export const lensVerdictSchema = z.object({
  lensType: z.enum(["CONTENT", "STRATEGY", "ENGAGEMENT"]),
  winner: z.enum(["PROP", "OPP"]),
  reasoning: z.string(),
  speakerScores: z.record(z.string(), z.number()),
  keyMoments: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

// Calibration result (Phase 4 output)
export const calibrationResultSchema = z.object({
  disagreements: z.array(z.object({
    issue: z.string(),
    action: z.enum(["ALIGN", "OVERRIDE", "WEIGHT_SHIFT"]),
    reasoning: z.string(),
    lensAffected: z.string(),
  })),
  finalScores: z.record(z.string(), z.object({
    content: z.number(),
    strategy: z.number(),
    engagement: z.number(),
    total: z.number(),
  })),
  winner: z.enum(["PROP", "OPP"]),
  winnerReasoning: z.string(),
  propTotal: z.number(),
  oppTotal: z.number(),
});

// Final ballot (Phase 5 output)
export const finalBallotSchema = z.object({
  winner: z.enum(["PROP", "OPP"]),
  winnerReasoning: z.string(),
  speakerScores: z.record(z.string(), z.object({
    content: z.number(),
    strategy: z.number(),
    engagement: z.number(),
    total: z.number(),
  })),
  speakerFeedback: z.record(z.string(), z.string()),
  turningPoints: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  disclaimer: z.string(),
  propTotal: z.number(),
  oppTotal: z.number(),
});

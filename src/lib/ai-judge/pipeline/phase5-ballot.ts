import type { LLMProvider, CalibrationResult, FinalBallot } from "../types";
import { BALLOT_WRITER_SYSTEM, ballotWriterUserPrompt } from "../prompts/ballot-writer";
import { extractJson } from "../utils/json-parser";

export async function runPhase5(
  provider: LLMProvider,
  calibration: CalibrationResult,
): Promise<{ ballot: FinalBallot; tokensUsed: number; apiCalls: number }> {
  const result = await provider.call({
    systemPrompt: BALLOT_WRITER_SYSTEM,
    userPrompt: ballotWriterUserPrompt(JSON.stringify(calibration)),
    responseFormat: "json",
    maxTokens: 4000,
  });

  const ballot = extractJson<FinalBallot>(result.content);

  // Ensure disclaimer is present
  if (!ballot.disclaimer) {
    ballot.disclaimer =
      "AI-generated analysis based on text only. Does not replace human judges. Style scores reflect textual analysis only and do not account for delivery.";
  }

  return {
    ballot,
    tokensUsed: result.tokensUsed.input + result.tokensUsed.output,
    apiCalls: 1,
  };
}

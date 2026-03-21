import type { LLMProvider, LensVerdict, CalibrationResult } from "../types";
import { CALIBRATOR_SYSTEM, calibratorUserPrompt } from "../prompts/calibrator";
import { extractJson } from "../utils/json-parser";

export async function runPhase4(
  provider: LLMProvider,
  verdicts: LensVerdict[],
): Promise<{ calibration: CalibrationResult; tokensUsed: number; apiCalls: number }> {
  const contentVerdict = verdicts.find((v) => v.lensType === "CONTENT");
  const styleVerdict = verdicts.find((v) => v.lensType === "STYLE");
  const strategyVerdict = verdicts.find((v) => v.lensType === "STRATEGY");

  if (!contentVerdict && !styleVerdict && !strategyVerdict) {
    throw new Error("No lens verdicts available for calibration");
  }

  const result = await provider.call({
    systemPrompt: CALIBRATOR_SYSTEM,
    userPrompt: calibratorUserPrompt(
      contentVerdict ? JSON.stringify(contentVerdict) : "CONTENT LENS FAILED - not available",
      strategyVerdict ? JSON.stringify(strategyVerdict) : "STRATEGY LENS FAILED - not available",
      styleVerdict ? JSON.stringify(styleVerdict) : "STYLE LENS FAILED - not available",
    ),
    responseFormat: "json",
    maxTokens: 3000,
  });

  const calibration = extractJson<CalibrationResult>(result.content);

  return {
    calibration,
    tokensUsed: result.tokensUsed.input + result.tokensUsed.output,
    apiCalls: 1,
  };
}

import type { LensRunner } from "./types";
import type { LLMProvider, Speech, DebateContext, SpeechAnalysis, LensVerdict } from "../types";
import { ENGAGEMENT_ANALYST_SYSTEM, engagementAnalystUserPrompt } from "../prompts/engagement-analyst";
import { extractJson } from "../utils/json-parser";
import { buildMemorySummary } from "../utils/memory";
import { clampScore } from "../utils/scoring";

export function createEngagementLens(provider: LLMProvider): LensRunner {
  return {
    lensType: "ENGAGEMENT",

    async analyzeSpeech(
      speech: Speech,
      debateContext: DebateContext,
      previousAnalyses: SpeechAnalysis[],
    ) {
      const contextStr = JSON.stringify(debateContext);
      const memoryStr = buildMemorySummary(previousAnalyses);

      const result = await provider.call({
        systemPrompt: ENGAGEMENT_ANALYST_SYSTEM,
        userPrompt: engagementAnalystUserPrompt(
          speech.index,
          speech.role,
          speech.side,
          speech.speakerName,
          speech.text,
          contextStr,
          memoryStr,
          speech.isReply,
        ),
        responseFormat: "json",
        maxTokens: 2000,
      });

      const parsed = extractJson<{
        score: number;
        memorySummary: string;
        [key: string]: unknown;
      }>(result.content);

      const analysis: SpeechAnalysis = {
        speechIndex: speech.index,
        role: speech.role,
        side: speech.side,
        analysis: parsed,
        score: clampScore(parsed.score, speech.isReply),
        memory: parsed.memorySummary ?? "",
      };

      return {
        analysis,
        tokensUsed: result.tokensUsed.input + result.tokensUsed.output,
      };
    },

    async synthesize(analyses: SpeechAnalysis[], debateContext: DebateContext) {
      const result = await provider.call({
        systemPrompt: `You are a WSDC Engagement/Style specialist producing your final verdict after analyzing all 8 speeches.

Based on your speech-by-speech analysis, produce a final verdict for the ENGAGEMENT dimension.
Note: Style scores are based on textual analysis only and do not reflect delivery.

Output as JSON:
{
  "lensType": "ENGAGEMENT",
  "winner": "PROP"|"OPP",
  "reasoning": "detailed reasoning for your engagement verdict",
  "speakerScores": {"PROP_1": <n>, "OPP_1": <n>, "PROP_2": <n>, "OPP_2": <n>, "PROP_3": <n>, "OPP_3": <n>, "OPP_REPLY": <n>, "PROP_REPLY": <n>},
  "keyMoments": ["moment 1", "moment 2", ...],
  "confidence": <0.0-1.0>
}`,
        userPrompt: `DEBATE CONTEXT: ${JSON.stringify(debateContext)}

SPEECH-BY-SPEECH ANALYSES:
${analyses.map((a) => `Speech ${a.speechIndex + 1} (${a.role}): Score ${a.score}\n${a.memory}`).join("\n\n")}

Produce your final ENGAGEMENT verdict. Respond with JSON only.`,
        responseFormat: "json",
        maxTokens: 2000,
      });

      const verdict = extractJson<LensVerdict>(result.content);
      verdict.lensType = "ENGAGEMENT";

      return {
        verdict,
        tokensUsed: result.tokensUsed.input + result.tokensUsed.output,
      };
    },
  };
}

import type { LensRunner } from "./types";
import type { LLMProvider, Speech, DebateContext, SpeechAnalysis, LensVerdict } from "../types";
import { CONTENT_ANALYST_SYSTEM, contentAnalystUserPrompt } from "../prompts/content-analyst";
import { extractJson } from "../utils/json-parser";
import { buildMemorySummary } from "../utils/memory";
import { clampScore } from "../utils/scoring";

export function createContentLens(provider: LLMProvider): LensRunner {
  return {
    lensType: "CONTENT",

    async analyzeSpeech(
      speech: Speech,
      debateContext: DebateContext,
      previousAnalyses: SpeechAnalysis[],
    ) {
      const contextStr = JSON.stringify(debateContext);
      const memoryStr = buildMemorySummary(previousAnalyses);

      const result = await provider.call({
        systemPrompt: CONTENT_ANALYST_SYSTEM,
        userPrompt: contentAnalystUserPrompt(
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
        systemPrompt: `You are a WSDC Content/Matter specialist producing your final verdict after analyzing all 8 speeches.

Based on your speech-by-speech analysis, produce a final verdict for the CONTENT dimension.

Output as JSON:
{
  "lensType": "CONTENT",
  "winner": "PROP"|"OPP",
  "reasoning": "detailed reasoning for your content verdict",
  "speakerScores": {"PROP_1": <n>, "OPP_1": <n>, "PROP_2": <n>, "OPP_2": <n>, "PROP_3": <n>, "OPP_3": <n>, "OPP_REPLY": <n>, "PROP_REPLY": <n>},
  "keyMoments": ["moment 1", "moment 2", ...],
  "confidence": <0.0-1.0>
}`,
        userPrompt: `DEBATE CONTEXT: ${JSON.stringify(debateContext)}

SPEECH-BY-SPEECH ANALYSES:
${analyses.map((a) => `Speech ${a.speechIndex + 1} (${a.role}): Score ${a.score}\n${a.memory}`).join("\n\n")}

Produce your final CONTENT verdict. Respond with JSON only.`,
        responseFormat: "json",
        maxTokens: 2000,
      });

      const verdict = extractJson<LensVerdict>(result.content);
      verdict.lensType = "CONTENT";

      return {
        verdict,
        tokensUsed: result.tokensUsed.input + result.tokensUsed.output,
      };
    },
  };
}

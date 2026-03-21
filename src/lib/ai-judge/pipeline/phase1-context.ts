import type { LLMProvider, DebateContext } from "../types";
import { CONTEXT_BUILDER_SYSTEM, contextBuilderUserPrompt } from "../prompts/context-builder";
import { extractJson } from "../utils/json-parser";

export async function runPhase1(
  provider: LLMProvider,
  motion: string,
  infoSlide: string | null,
): Promise<{ context: DebateContext; tokensUsed: number; apiCalls: number }> {
  const result = await provider.call({
    systemPrompt: CONTEXT_BUILDER_SYSTEM,
    userPrompt: contextBuilderUserPrompt(motion, infoSlide),
    responseFormat: "json",
    maxTokens: 2000,
  });

  const context = extractJson<DebateContext>(result.content);

  return {
    context,
    tokensUsed: result.tokensUsed.input + result.tokensUsed.output,
    apiCalls: 1,
  };
}

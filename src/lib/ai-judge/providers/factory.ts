import type { LLMProvider } from "../types";
import { OpenAIProvider } from "./openai";
import { GoogleProvider } from "./google";
import { OpenRouterProvider } from "./openrouter";
import { FallbackProvider } from "./fallback";

export interface ProviderAssignment {
  contextBuilder: LLMProvider;
  contentLens: LLMProvider;
  styleLens: LLMProvider;
  strategyLens: LLMProvider;
  calibrator: LLMProvider;
  ballotWriter: LLMProvider;
}

/**
 * Free OpenRouter models to cycle through as fallbacks.
 * Each one is tried in order — if one hits rate limits, the next is used.
 */
const FREE_OPENROUTER_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "stepfun/step-3.5-flash:free",
  "arcee-ai/trinity-large-preview:free",
];

/**
 * Builds a flat list of all available provider instances.
 * OpenRouter free models come first (one instance per model),
 * then Google, then OpenAI as paid fallback.
 */
function getAllProviders(): LLMProvider[] {
  const providers: LLMProvider[] = [];

  if (process.env.OPENROUTER_API_KEY) {
    for (const model of FREE_OPENROUTER_MODELS) {
      providers.push(new OpenRouterProvider(model));
    }
  }

  if (process.env.GOOGLE_AI_API_KEY) {
    providers.push(new GoogleProvider("gemini-2.0-flash"));
  }

  if (process.env.OPENAI_API_KEY) {
    providers.push(new OpenAIProvider("gpt-4o-mini"));
  }

  return providers;
}

/**
 * Creates a FallbackProvider that tries all available providers in order.
 * For lens diversity, each lens starts at a different offset in the list
 * so they don't all hit the same model simultaneously.
 */
function createFallbackChain(
  providers: LLMProvider[],
  offset: number = 0,
): LLMProvider {
  if (providers.length === 0) {
    throw new Error(
      "No AI provider API keys configured. Set at least one of: OPENAI_API_KEY, GOOGLE_AI_API_KEY, OPENROUTER_API_KEY",
    );
  }

  if (providers.length === 1) {
    return providers[0]!;
  }

  // Rotate the list so different phases/lenses start with different providers
  const rotated = [
    ...providers.slice(offset % providers.length),
    ...providers.slice(0, offset % providers.length),
  ];

  return new FallbackProvider(rotated);
}

export function createProviderAssignment(): ProviderAssignment {
  const providers = getAllProviders();

  if (providers.length === 0) {
    throw new Error(
      "No AI provider API keys configured. Set at least one of: OPENAI_API_KEY, GOOGLE_AI_API_KEY, OPENROUTER_API_KEY",
    );
  }

  return {
    contextBuilder: createFallbackChain(providers, 0),
    contentLens: createFallbackChain(providers, 0),
    styleLens: createFallbackChain(providers, 1),
    strategyLens: createFallbackChain(providers, 2),
    calibrator: createFallbackChain(providers, 0),
    ballotWriter: createFallbackChain(providers, 0),
  };
}

export function getModelsUsed(assignment: ProviderAssignment): Record<string, string> {
  return {
    contextBuilder: assignment.contextBuilder.name,
    contentLens: assignment.contentLens.name,
    styleLens: assignment.styleLens.name,
    strategyLens: assignment.strategyLens.name,
    calibrator: assignment.calibrator.name,
    ballotWriter: assignment.ballotWriter.name,
  };
}

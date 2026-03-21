import type { LLMProvider } from "../types";
import { OpenAIProvider } from "./openai";
import { GoogleProvider } from "./google";
import { OpenRouterProvider } from "./openrouter";

export interface ProviderAssignment {
  contextBuilder: LLMProvider;
  contentLens: LLMProvider;
  strategyLens: LLMProvider;
  engagementLens: LLMProvider;
  calibrator: LLMProvider;
  ballotWriter: LLMProvider;
}

function getAvailableProviders(): LLMProvider[] {
  const providers: LLMProvider[] = [];

  // Order by cost: Google (free tier) > OpenRouter (free models available) > OpenAI ($0.15/1M)
  if (process.env.GOOGLE_AI_API_KEY) {
    providers.push(new GoogleProvider("gemini-2.0-flash"));
  }
  if (process.env.OPENROUTER_API_KEY) {
    providers.push(new OpenRouterProvider());
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push(new OpenAIProvider("gpt-4o-mini"));
  }

  return providers;
}

export function createProviderAssignment(): ProviderAssignment {
  const providers = getAvailableProviders();

  if (providers.length === 0) {
    throw new Error(
      "No AI provider API keys configured. Set at least one of: OPENAI_API_KEY, GOOGLE_AI_API_KEY, OPENROUTER_API_KEY",
    );
  }

  // Pick the first available (cheapest) for all phases
  const strongest = providers[0]!; // First provider is cheapest (Google > OpenRouter > OpenAI)

  // Distribute lenses across different providers for diversity
  const contentLens = providers[0] ?? strongest;
  const strategyLens = providers[1] ?? providers[0] ?? strongest;
  const engagementLens = providers[2] ?? providers[1] ?? providers[0] ?? strongest;

  return {
    contextBuilder: strongest,
    contentLens,
    strategyLens,
    engagementLens,
    calibrator: strongest,
    ballotWriter: strongest,
  };
}

export function getModelsUsed(assignment: ProviderAssignment): Record<string, string> {
  return {
    contextBuilder: assignment.contextBuilder.name,
    contentLens: assignment.contentLens.name,
    strategyLens: assignment.strategyLens.name,
    engagementLens: assignment.engagementLens.name,
    calibrator: assignment.calibrator.name,
    ballotWriter: assignment.ballotWriter.name,
  };
}

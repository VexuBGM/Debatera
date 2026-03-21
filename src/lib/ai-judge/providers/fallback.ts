import type { LLMProvider, LLMCallParams, LLMCallResult } from "../types";

/**
 * A provider that tries multiple providers in order.
 * If one fails (after its own internal retries), the next one is tried.
 * Only throws if ALL providers fail.
 */
export class FallbackProvider implements LLMProvider {
  name: string;
  private providers: LLMProvider[];

  constructor(providers: LLMProvider[]) {
    if (providers.length === 0) {
      throw new Error("FallbackProvider requires at least one provider.");
    }
    this.providers = providers;
    this.name = providers.map((p) => p.name).join(" -> ");
  }

  async call(params: LLMCallParams): Promise<LLMCallResult> {
    const errors: { provider: string; error: string }[] = [];

    for (const provider of this.providers) {
      try {
        const result = await provider.call(params);
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `[FallbackProvider] ${provider.name} failed, trying next. Error: ${message.slice(0, 200)}`,
        );
        errors.push({ provider: provider.name, error: message });
      }
    }

    const summary = errors
      .map((e) => `  ${e.provider}: ${e.error.slice(0, 150)}`)
      .join("\n");
    throw new Error(
      `All ${this.providers.length} providers failed:\n${summary}`,
    );
  }
}

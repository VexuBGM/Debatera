import type { LLMProvider, LLMCallParams, LLMCallResult } from "../types";
import { LLM_CONFIG } from "../constants";

export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;

  abstract call(params: LLMCallParams): Promise<LLMCallResult>;

  protected async callWithRetry(
    fn: () => Promise<LLMCallResult>,
  ): Promise<LLMCallResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= LLM_CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < LLM_CONFIG.RETRY_ATTEMPTS) {
          const delay = LLM_CONFIG.RETRY_DELAYS_MS[attempt] ?? 3000;
          console.warn(
            `[${this.name}] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
            lastError.message,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

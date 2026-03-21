/**
 * OpenRouter Chat Completions Provider
 *
 * Uses the OpenAI-compatible chat completions endpoint at:
 *   POST https://openrouter.ai/api/v1/chat/completions
 *
 * Default model: openrouter/free (auto-routes to best available free model)
 *   - $0 per token
 *   - Rate limits: 50 req/day (no credits) or 1000 req/day (with $10+ credits)
 *
 * Can be swapped to any OpenRouter model by changing the model string.
 */

import { BaseLLMProvider } from "./base";
import type { LLMCallParams, LLMCallResult } from "../types";
import { LLM_CONFIG } from "../constants";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

interface OpenRouterChoice {
  index: number;
  message: { role: string; content: string | null };
  finish_reason: string;
}

interface OpenRouterChatResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterProvider extends BaseLLMProvider {
  name: string;
  private model: string;

  constructor(model?: string) {
    super();
    this.model =
      model ??
      process.env.OPENROUTER_CHAT_MODEL ??
      "openrouter/free";
    this.name = `openrouter/${this.model}`;
  }

  async call(params: LLMCallParams): Promise<LLMCallResult> {
    return this.callWithRetry(async () => {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is not set.");
      }

      const body: Record<string, unknown> = {
        model: this.model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        temperature: params.temperature ?? LLM_CONFIG.DEFAULT_TEMPERATURE,
        max_tokens: params.maxTokens ?? LLM_CONFIG.DEFAULT_MAX_TOKENS,
      };

      if (params.responseFormat === "json") {
        body.response_format = { type: "json_object" };
      }

      const res = await fetch(OPENROUTER_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(process.env.NEXT_PUBLIC_BASE_URL && {
            "HTTP-Referer": process.env.NEXT_PUBLIC_BASE_URL,
          }),
          "X-OpenRouter-Title": "Debatera AI Judge",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(
          `OpenRouter chat failed (${res.status}): ${errText.slice(0, 300)}`,
        );
      }

      const data = (await res.json()) as OpenRouterChatResponse;
      const content = data.choices[0]?.message?.content ?? "";

      return {
        content,
        tokensUsed: {
          input: data.usage?.prompt_tokens ?? 0,
          output: data.usage?.completion_tokens ?? 0,
        },
      };
    });
  }
}

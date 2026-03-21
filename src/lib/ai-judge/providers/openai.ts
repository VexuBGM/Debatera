import OpenAI from "openai";
import { BaseLLMProvider } from "./base";
import type { LLMCallParams, LLMCallResult } from "../types";
import { LLM_CONFIG } from "../constants";

export class OpenAIProvider extends BaseLLMProvider {
  name: string;
  private client: OpenAI;
  private model: string;

  constructor(model: string = "gpt-4o-mini") {
    super();
    this.model = model;
    this.name = `openai/${model}`;
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async call(params: LLMCallParams): Promise<LLMCallResult> {
    return this.callWithRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        temperature: params.temperature ?? LLM_CONFIG.DEFAULT_TEMPERATURE,
        max_tokens: params.maxTokens ?? LLM_CONFIG.DEFAULT_MAX_TOKENS,
        ...(params.responseFormat === "json" && {
          response_format: { type: "json_object" },
        }),
      });

      const content = response.choices[0]?.message?.content ?? "";
      const usage = response.usage;

      return {
        content,
        tokensUsed: {
          input: usage?.prompt_tokens ?? 0,
          output: usage?.completion_tokens ?? 0,
        },
      };
    });
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseLLMProvider } from "./base";
import type { LLMCallParams, LLMCallResult } from "../types";
import { LLM_CONFIG } from "../constants";

export class GoogleProvider extends BaseLLMProvider {
  name: string;
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(model: string = "gemini-2.0-flash") {
    super();
    this.model = model;
    this.name = `google/${model}`;
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "");
  }

  async call(params: LLMCallParams): Promise<LLMCallResult> {
    return this.callWithRetry(async () => {
      const generativeModel = this.genAI.getGenerativeModel({
        model: this.model,
        systemInstruction: params.systemPrompt,
        generationConfig: {
          temperature: params.temperature ?? LLM_CONFIG.DEFAULT_TEMPERATURE,
          maxOutputTokens: params.maxTokens ?? LLM_CONFIG.DEFAULT_MAX_TOKENS,
          ...(params.responseFormat === "json" && {
            responseMimeType: "application/json",
          }),
        },
      });

      const result = await generativeModel.generateContent(params.userPrompt);
      const response = result.response;
      const content = response.text();
      const usage = response.usageMetadata;

      return {
        content,
        tokensUsed: {
          input: usage?.promptTokenCount ?? 0,
          output: usage?.candidatesTokenCount ?? 0,
        },
      };
    });
  }
}

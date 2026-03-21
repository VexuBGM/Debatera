import type { LLMProvider, Speech, DebateContext, SpeechAnalysis, LensVerdict } from "../types";

export interface LensConfig {
  lensType: "CONTENT" | "STRATEGY" | "ENGAGEMENT";
  provider: LLMProvider;
  systemPrompt: string;
  buildUserPrompt: (
    speechIndex: number,
    speakerRole: string,
    side: string,
    speakerName: string | null,
    speechText: string,
    debateContext: string,
    previousMemory: string,
    isReply: boolean,
  ) => string;
}

export interface LensRunner {
  lensType: "CONTENT" | "STRATEGY" | "ENGAGEMENT";
  analyzeSpeech(
    speech: Speech,
    debateContext: DebateContext,
    previousAnalyses: SpeechAnalysis[],
  ): Promise<{ analysis: SpeechAnalysis; tokensUsed: number }>;
  synthesize(
    analyses: SpeechAnalysis[],
    debateContext: DebateContext,
  ): Promise<{ verdict: LensVerdict; tokensUsed: number }>;
}

// All TypeScript types/interfaces for the AI Judge system

export type SideLabel = "PROP" | "OPP";

export interface Speech {
  index: number;
  role: string;
  label: string;
  side: SideLabel;
  isReply: boolean;
  speakerName: string | null;
  text: string;
}

export interface ParsedTranscript {
  motion: string;
  infoSlide: string | null;
  speeches: Speech[];
}

// Phase 1: Context Builder output
export interface DebateContext {
  motion: string;
  coreIssues: string[];
  reasonableDefinition: string;
  propBurdens: string[];
  oppBurdens: string[];
  judgingFramework: string;
}

// Phase 2: Lens analysis types
export interface SpeechAnalysis {
  speechIndex: number;
  role: string;
  side: SideLabel;
  analysis: Record<string, unknown>;
  score: number;
  memory: string; // Compressed analysis summary for next speech
}

export interface ArgumentMapEntry {
  claim: string;
  warrant: string;
  impact: string;
  side: SideLabel;
  speechIndex: number;
  rebutted: boolean;
  rebuttedBy?: number;
}

export interface ContentMemory {
  argumentMap: ArgumentMapEntry[];
  drops: { argument: string; side: SideLabel; speechIndex: number }[];
  rebuttals: { original: string; response: string; speechIndex: number }[];
  summary: string;
}

export interface StrategyMemory {
  issueTracker: {
    issue: string;
    propPosition: string | null;
    oppPosition: string | null;
    advantage: SideLabel | "NEUTRAL";
  }[];
  framingAttempts: { side: SideLabel; frame: string; speechIndex: number }[];
  summary: string;
}

export interface EngagementMemory {
  clashMatrix: {
    issue: string;
    propEngagement: string | null;
    oppEngagement: string | null;
    quality: number;
  }[];
  poiInteractions: { speechIndex: number; description: string; quality: number }[];
  summary: string;
}

// Phase 3: Per-lens verdict
export interface LensVerdict {
  lensType: "CONTENT" | "STRATEGY" | "ENGAGEMENT";
  winner: SideLabel;
  reasoning: string;
  speakerScores: Record<string, number>; // role -> score
  keyMoments: string[];
  confidence: number;
}

// Phase 4: Calibration
export interface CalibrationResolution {
  issue: string;
  action: "ALIGN" | "OVERRIDE" | "WEIGHT_SHIFT";
  reasoning: string;
  lensAffected: string;
}

export interface CalibrationResult {
  disagreements: CalibrationResolution[];
  finalScores: Record<string, {
    content: number;
    strategy: number;
    engagement: number;
    total: number;
  }>;
  winner: SideLabel;
  winnerReasoning: string;
  propTotal: number;
  oppTotal: number;
}

// Phase 5: Final ballot
export interface FinalBallot {
  winner: SideLabel;
  winnerReasoning: string;
  speakerScores: Record<string, {
    content: number;
    strategy: number;
    engagement: number;
    total: number;
  }>;
  speakerFeedback: Record<string, string>;
  turningPoints: string[];
  confidence: number;
  disclaimer: string;
  propTotal: number;
  oppTotal: number;
}

// LLM Provider types
export interface LLMCallParams {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json";
}

export interface LLMCallResult {
  content: string;
  tokensUsed: { input: number; output: number };
}

export interface LLMProvider {
  name: string;
  call(params: LLMCallParams): Promise<LLMCallResult>;
}

// Pipeline progress tracking
export interface PipelineProgress {
  phase: number;
  phaseName: string;
  currentSpeech: number;
  totalApiCalls: number;
  totalTokensUsed: number;
}

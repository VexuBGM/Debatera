// WSDC format specifics and AI Judge configuration constants

export const WSDC = {
  SPEECHES: [
    { index: 0, role: "PROP_1", label: "1st Proposition", side: "PROP", isReply: false, maxMinutes: 8 },
    { index: 1, role: "OPP_1", label: "1st Opposition", side: "OPP", isReply: false, maxMinutes: 8 },
    { index: 2, role: "PROP_2", label: "2nd Proposition", side: "PROP", isReply: false, maxMinutes: 8 },
    { index: 3, role: "OPP_2", label: "2nd Opposition", side: "OPP", isReply: false, maxMinutes: 8 },
    { index: 4, role: "PROP_3", label: "3rd Proposition", side: "PROP", isReply: false, maxMinutes: 8 },
    { index: 5, role: "OPP_3", label: "3rd Opposition", side: "OPP", isReply: false, maxMinutes: 8 },
    { index: 6, role: "OPP_REPLY", label: "Opposition Reply", side: "OPP", isReply: true, maxMinutes: 4 },
    { index: 7, role: "PROP_REPLY", label: "Proposition Reply", side: "PROP", isReply: true, maxMinutes: 4 },
  ],
  SCORE_RANGE: { min: 60, max: 80 },
  REPLY_SCORE_RANGE: { min: 30, max: 40 },
  DIMENSION_WEIGHTS: {
    content: 0.40,
    style: 0.40,
    strategy: 0.20,
  },
  TOTAL_SPEECHES: 8,
} as const;

export const LLM_CONFIG = {
  DEFAULT_TEMPERATURE: 0.3,
  DEFAULT_MAX_TOKENS: 2000,
  RETRY_ATTEMPTS: 1,
  RETRY_DELAYS_MS: [1000],
} as const;

export const PIPELINE_PHASES = {
  CONTEXT_BUILDING: 1,
  ANALYZING: 2,
  SYNTHESIZING: 3,
  CALIBRATING: 4,
  WRITING_BALLOT: 5,
} as const;

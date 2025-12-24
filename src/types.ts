export type Mode = 'NORMAL' | 'SUPPORTIVE' | 'CRISIS';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
  timestamp: string;
};

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type Intent = 'MENTAL_HEALTH' | 'GENERAL' | 'UNKNOWN';

export type InputAnalysis = {
  intent: Intent;
  riskLevel: RiskLevel;
  safetyFlags: string[];
  suggestedMode: Mode;
  modeReason: string;
  // Semantic classifier fields (optional)
  rationale?: string;
  semanticUsed?: boolean;
  semanticRiskLevel?: RiskLevel;
  semanticModeReason?: string;
};

export type BuiltPrompt = {
  promptVersion: string;
  system: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
};

export type ValidationResult = {
  isSafe: boolean;
  safetyFlags: string[];
  sanitizedText?: string;
  reason?: string;
};

export type LLMRequest = {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  maxTokens?: number;
};

export type LLMResponse = {
  text: string;
};

export type ChatRequest = {
  conversationId: string;
  userId?: string;
  message: string;
  client?: {
    platform?: 'ios' | 'android';
    appVersion?: string;
    timezone?: string;
  };
};

export type ChatResponse = {
  conversationId: string;
  assistantMessage: string;
  mode: Mode;
  metadata: {
    latencyMs: number;
    safetyFlags: string[];
    promptVersion: string;
    llmProvider: string;
    modeReason: string;
    riskLevel?: RiskLevel;
    semanticUsed?: boolean;
  };
};


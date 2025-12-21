export type Mode = 'NORMAL' | 'SUPPORTIVE' | 'CRISIS';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
  timestamp: string;
};

export type InputAnalysis = {
  intent: 'MENTAL_HEALTH' | 'GENERAL' | 'UNKNOWN';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  safetyFlags: string[];
  suggestedMode: Mode;
  modeReason: string;
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
  };
};


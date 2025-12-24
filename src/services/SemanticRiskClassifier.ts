import { Mode, RiskLevel, Intent } from '../types';
import LLMClient from '../llm/LLMClient';

export type SemanticClassification = {
  riskLevel: RiskLevel;
  intent: Intent;
  suggestedMode: Mode;
  safetyFlags: string[];
  rationale: string;
};

// Environment configuration - read lazily to allow dotenv to load first
function getSemanticEnabled(): boolean {
  return process.env.SEMANTIC_CLASSIFIER_ENABLED === 'true';
}

function getSemanticTimeoutMs(): number {
  return parseInt(process.env.SEMANTIC_CLASSIFIER_TIMEOUT_MS || '8000', 10);
}

// Classification prompt - kept minimal and focused
const CLASSIFICATION_SYSTEM_PROMPT = `You are a risk classifier for self-harm and crisis escalation in a mental health support application.

Return ONLY valid JSON (no markdown, no extra text).

Core principle:
- Be safety-oriented, but do NOT label general sadness/hopelessness as HIGH unless there is evidence of self-harm intent, desire for death, imminent timing, planning, or strong finality.

Rules:
- If uncertain between LOW vs MEDIUM, choose MEDIUM.
- If uncertain between MEDIUM vs HIGH, choose HIGH only if there is any hint of self-harm intent, desire to die, preparation/finality, or imminent timing.
- Do NOT diagnose or mention specific disorders.
- Do NOT provide medical advice.
- Focus on detecting: suicidal ideation, self-harm intent, planning/preparation, imminent risk, severe crisis states.

Output JSON schema:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "intent": "MENTAL_HEALTH" | "GENERAL" | "UNKNOWN",
  "suggestedMode": "NORMAL" | "SUPPORTIVE" | "CRISIS",
  "safetyFlags": ["flag1", "flag2"],
  "rationale": "one short sentence explaining classification"
}

Risk level guidelines:
- HIGH (CRISIS): Any of the following:
  - Explicit desire to die / suicide / self-harm
  - Intent or urge to self-harm ("might do it", "can't stop myself")
  - Planning or preparation / finality ("putting affairs in order", "wrote letters", "saying goodbye", "tonight is the time")
  - Strong burden statements implying removal ("everyone better off without me", "they'd be happier if I wasn't around")
  - Any mention of method or imminent timing (even vague)
- MEDIUM (SUPPORTIVE):
  - Hopelessness or despair WITHOUT intent ("nothing matters", "what's the point", "I feel empty")
  - Emotional distress (anxiety, depression, grief, overwhelmed, lonely)
  - Passive escape language without clear intent ("I want to disappear", "I want it to stop") unless it implies permanence/death
- LOW (NORMAL):
  - Neutral conversation, everyday topics, mild concerns without emotional distress

Mode mapping:
- HIGH → CRISIS
- MEDIUM → SUPPORTIVE
- LOW → NORMAL`;

/**
 * Conservative fallback when parsing fails or timeout occurs
 */
function getConservativeFallback(flag: string): SemanticClassification {
  return {
    riskLevel: 'MEDIUM',
    intent: 'UNKNOWN',
    suggestedMode: 'SUPPORTIVE',
    safetyFlags: [flag],
    rationale: 'Fallback classification due to processing error',
  };
}

/**
 * Parse LLM response to SemanticClassification
 * Handles code fences and validates structure
 */
function parseClassificationResponse(text: string): SemanticClassification {
  // Strip code fences if present
  let cleaned = text.trim();
  
  // Remove markdown code fences
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  
  cleaned = cleaned.trim();
  
  // Parse JSON
  const parsed = JSON.parse(cleaned);
  
  // Validate required fields
  const validRiskLevels: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
  const validIntents: Intent[] = ['MENTAL_HEALTH', 'GENERAL', 'UNKNOWN'];
  const validModes: Mode[] = ['NORMAL', 'SUPPORTIVE', 'CRISIS'];
  
  if (!validRiskLevels.includes(parsed.riskLevel)) {
    throw new Error(`Invalid riskLevel: ${parsed.riskLevel}`);
  }
  
  if (!validIntents.includes(parsed.intent)) {
    throw new Error(`Invalid intent: ${parsed.intent}`);
  }
  
  if (!validModes.includes(parsed.suggestedMode)) {
    throw new Error(`Invalid suggestedMode: ${parsed.suggestedMode}`);
  }
  
  return {
    riskLevel: parsed.riskLevel as RiskLevel,
    intent: parsed.intent as Intent,
    suggestedMode: parsed.suggestedMode as Mode,
    safetyFlags: Array.isArray(parsed.safetyFlags) ? parsed.safetyFlags : [],
    rationale: typeof parsed.rationale === 'string' ? parsed.rationale : 'No rationale provided',
  };
}

/**
 * Create a promise that rejects after timeout
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('SEMANTIC_TIMEOUT')), ms);
  });
}

class SemanticRiskClassifier {
  /**
   * Check if semantic classification is enabled
   */
  isEnabled(): boolean {
    return getSemanticEnabled();
  }

  /**
   * Classify text for risk using LLM
   * Returns conservative fallback on any error
   */
  async classify(text: string): Promise<SemanticClassification> {
    if (!getSemanticEnabled()) {
      return getConservativeFallback('SEMANTIC_DISABLED');
    }

    try {
      // Create classification request with timeout
      const classificationPromise = LLMClient.generate({
        messages: [
          { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
          { role: 'user', content: `Classify this message:\n\n"${text}"` },
        ],
        temperature: 0.0,
        maxTokens: 200,
      });

      // Race against timeout
      const response = await Promise.race([
        classificationPromise,
        createTimeout(getSemanticTimeoutMs()),
      ]);

      // Parse response
      const classification = parseClassificationResponse(response.text);
      
      // Add semantic flag based on risk level
      if (classification.riskLevel === 'HIGH') {
        classification.safetyFlags.push('LLM_SEMANTIC_HIGH_RISK');
      } else if (classification.riskLevel === 'MEDIUM') {
        classification.safetyFlags.push('LLM_SEMANTIC_MEDIUM_RISK');
      }
      
      return classification;
    } catch (error) {
      // Determine appropriate fallback flag
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage === 'SEMANTIC_TIMEOUT') {
        console.warn('[SemanticRiskClassifier] Timeout reached, using fallback');
        return getConservativeFallback('SEMANTIC_TIMEOUT');
      }
      
      console.warn('[SemanticRiskClassifier] Parse/request failed:', errorMessage);
      return getConservativeFallback('SEMANTIC_PARSE_FAIL');
    }
  }
}

export default new SemanticRiskClassifier();


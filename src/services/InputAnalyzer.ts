import { InputAnalysis, Mode } from '../types';

// Crisis keywords that indicate HIGH risk
const CRISIS_KEYWORDS = [
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
  'self-harm',
  'hurt myself',
  'no reason to live',
  'better off dead',
];

// Mental health keywords that suggest SUPPORTIVE mode
const MENTAL_HEALTH_KEYWORDS = [
  'anxious',
  'anxiety',
  'depressed',
  'depression',
  'stressed',
  'overwhelmed',
  'lonely',
  'hopeless',
  'sad',
  'grief',
  'panic',
  'worried',
  'struggling',
  'mental health',
  'therapy',
  'counseling',
  'burnout',
  'exhausted',
  'can\'t cope',
  'breaking down',
];

class InputAnalyzer {
  async analyze(text: string): Promise<InputAnalysis> {
    const lowerText = text.toLowerCase();

    // Check for crisis keywords first (highest priority)
    for (const keyword of CRISIS_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        return {
          intent: 'MENTAL_HEALTH',
          riskLevel: 'HIGH',
          safetyFlags: ['CRISIS_KEYWORD_MATCH'],
          suggestedMode: 'CRISIS',
          modeReason: 'CRISIS_KEYWORD_MATCH',
        };
      }
    }

    // Check for mental health keywords
    for (const keyword of MENTAL_HEALTH_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        return {
          intent: 'MENTAL_HEALTH',
          riskLevel: 'MEDIUM',
          safetyFlags: [],
          suggestedMode: 'SUPPORTIVE',
          modeReason: 'MENTAL_HEALTH_KEYWORD_MATCH',
        };
      }
    }

    // Default: general conversation
    return {
      intent: 'GENERAL',
      riskLevel: 'LOW',
      safetyFlags: [],
      suggestedMode: 'NORMAL',
      modeReason: 'DEFAULT',
    };
  }
}

export default new InputAnalyzer();


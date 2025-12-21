import { Mode, ValidationResult } from '../types';

// Patterns that indicate unsafe responses
const DIAGNOSIS_PATTERNS = [
  'you have depression',
  'you are depressed',
  'you have anxiety',
  'you are bipolar',
  'you have ptsd',
  'you are schizophrenic',
  'you have ocd',
  'you suffer from',
  'you are clinically',
  'i diagnose',
  'my diagnosis',
];

const MEDICATION_PATTERNS = [
  'take xanax',
  'take prozac',
  'take zoloft',
  'take antidepressants',
  'take medication',
  'you should take',
  'i recommend taking',
  'try taking',
  'prescription for',
  'mg of',
  'dosage of',
];

const GUARANTEE_PATTERNS = [
  'you will be fine',
  'you will get better',
  'i promise',
  'i guarantee',
  'everything will be okay',
  'nothing bad will happen',
  'you will definitely',
];

const SAFE_FALLBACK_NORMAL = 
  "I'm here to listen and support you. Would you like to share more about what's on your mind?";

const SAFE_FALLBACK_SUPPORTIVE = 
  "I hear you, and I want you to know that your feelings are valid. " +
  "I'm here to listen without judgment. Would you like to tell me more about what you're experiencing?";

const SAFE_FALLBACK_CRISIS = 
  "I'm really glad you reached out. What you're feeling matters, and you don't have to face this alone. " +
  "Please consider reaching out to someone you trust—a friend, family member, or counselor. " +
  "If you're in immediate danger, please contact your local emergency services or a crisis helpline. " +
  "I'm here to listen.";

class ResponseValidator {
  async validate(
    mode: Mode,
    _userText: string,
    assistantText: string
  ): Promise<ValidationResult> {
    const lowerText = assistantText.toLowerCase();
    const safetyFlags: string[] = [];
    let isSafe = true;
    let reason: string | undefined;

    // Check for diagnosis patterns
    for (const pattern of DIAGNOSIS_PATTERNS) {
      if (lowerText.includes(pattern)) {
        isSafe = false;
        safetyFlags.push('DIAGNOSIS_DETECTED');
        reason = `Response contained diagnosis pattern: "${pattern}"`;
        break;
      }
    }

    // Check for medication advice
    if (isSafe) {
      for (const pattern of MEDICATION_PATTERNS) {
        if (lowerText.includes(pattern)) {
          isSafe = false;
          safetyFlags.push('MEDICATION_ADVICE_DETECTED');
          reason = `Response contained medication advice pattern: "${pattern}"`;
          break;
        }
      }
    }

    // Check for absolute guarantees
    if (isSafe) {
      for (const pattern of GUARANTEE_PATTERNS) {
        if (lowerText.includes(pattern)) {
          isSafe = false;
          safetyFlags.push('ABSOLUTE_GUARANTEE_DETECTED');
          reason = `Response contained guarantee pattern: "${pattern}"`;
          break;
        }
      }
    }

    // If unsafe, provide sanitized fallback
    if (!isSafe) {
      let sanitizedText: string;
      switch (mode) {
        case 'CRISIS':
          sanitizedText = SAFE_FALLBACK_CRISIS;
          break;
        case 'SUPPORTIVE':
          sanitizedText = SAFE_FALLBACK_SUPPORTIVE;
          break;
        default:
          sanitizedText = SAFE_FALLBACK_NORMAL;
      }

      return {
        isSafe: false,
        safetyFlags,
        sanitizedText,
        reason,
      };
    }

    return {
      isSafe: true,
      safetyFlags: [],
    };
  }
}

export default new ResponseValidator();


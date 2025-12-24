import { InputAnalysis, RiskLevel, Mode } from '../types';
import SemanticRiskClassifier from './SemanticRiskClassifier';

// =============================================================================
// CRISIS DETECTION - Multi-layered approach
// Layer 1: Explicit keywords (highest confidence)
// Layer 2: Regex patterns (catch variations)
// Layer 3: Soft signals with scoring (implicit indicators)
// =============================================================================

// Layer 1: Explicit crisis keywords - immediate CRISIS mode
const EXPLICIT_CRISIS_KEYWORDS = [
  // Direct suicidal ideation
  'suicide',
  'suicidal',
  'kill myself',
  'end my life',
  'take my life',
  'want to die',
  'wanna die',
  'ready to die',
  'planning to die',
  // Self-harm
  'self-harm',
  'self harm',
  'hurt myself',
  'cutting myself',
  'harming myself',
  // Hopelessness - explicit
  'no reason to live',
  'better off dead',
  'rather be dead',
  'wish i was dead',
  'wish i were dead',
  // Intent expressions
  'end it all',
  'ending it all',
  'not worth living',
  'can\'t go on',
  'cannot go on',
  // Methods (be careful - not too specific)
  'overdose',
  'jump off',
  'hang myself',
];

// Layer 2: Regex patterns - catch variations and phrases
const CRISIS_PATTERNS: RegExp[] = [
  // "want/wanna/gonna to die/end it/disappear"
  /\b(want|wanna|gonna|going|ready)\s+(to\s+)?(die|end\s+it|disappear|give\s+up\s+on\s+life)/i,
  // "kill/hurt/harm myself/me"
  /\b(kill|hurt|harm|cut|injure)\s+(myself|me|my\s+self)/i,
  // "don't want to live/be here/exist/wake up"
  /\b(don'?t|do\s+not|dont)\s+want\s+to\s+(live|be\s+here|exist|wake\s+up|be\s+alive)/i,
  // "better off/rather be dead/gone/not here"
  /\b(better\s+off|rather\s+be)\s+(dead|gone|not\s+here)/i,
  // "no reason/point/purpose to live/in living"
  /\b(no|without|lost)\s+(reason|point|purpose|will)\s+(to\s+live|in\s+living|to\s+go\s+on|anymore)/i,
  // "can't/cannot go on/do this/take it/handle this anymore"
  /\bcan'?t\s+(go\s+on|do\s+this|take\s+it|handle|continue|keep\s+going)(\s+anymore)?/i,
  // "end/ending my life/it all/everything"
  /\b(end|ending|finish)\s+(my\s+life|it\s+all|everything|this)/i,
  // "tired/sick of living/life" (serious - CRISIS)
  // Note: "tired of everything" moved to soft signals (less specific)
  /\b(tired|sick|done)\s+(of|with)\s+(living|life)/i,
  // "no one would care/miss me/notice"
  /\bno\s+one\s+(would|will|gonna)\s+(care|miss|notice)/i,
  // "world/everyone better without me"
  /\b(world|everyone|family|they).*(better|easier)\s+(off\s+)?without\s+me/i,
  // "want to disappear/vanish/not exist"
  /\bwant\s+to\s+(disappear|vanish|not\s+exist|cease\s+to\s+exist)/i,
];

// Layer 3: Soft crisis signals - score-based (implicit indicators)
// These alone might not indicate crisis, but combined they raise concern
const SOFT_CRISIS_SIGNALS: { pattern: string | RegExp; weight: number }[] = [
  // Emotional numbness
  { pattern: 'feel dead', weight: 4 },
  { pattern: 'dead inside', weight: 4 },
  { pattern: 'feel nothing', weight: 3 },
  { pattern: 'feel empty', weight: 3 },
  { pattern: 'feel numb', weight: 3 },
  { pattern: 'completely numb', weight: 4 },
  // Hopelessness indicators
  { pattern: 'no hope', weight: 4 },
  { pattern: 'lost hope', weight: 4 },
  { pattern: 'hopeless', weight: 3 },
  { pattern: 'what\'s the point', weight: 4 },
  { pattern: 'what is the point', weight: 4 },
  { pattern: 'whats the point', weight: 4 },
  { pattern: 'no point', weight: 3 },
  { pattern: 'pointless', weight: 2 },
  { pattern: 'why bother', weight: 3 },
  { pattern: 'why try', weight: 3 },
  // Giving up
  { pattern: 'give up', weight: 3 },
  { pattern: 'giving up', weight: 3 },
  { pattern: 'can\'t do this anymore', weight: 4 },
  { pattern: 'too much to handle', weight: 3 },
  { pattern: 'can\'t take it', weight: 4 },
  // Isolation
  { pattern: 'all alone', weight: 3 },
  { pattern: 'no one cares', weight: 4 },
  { pattern: 'nobody cares', weight: 4 },
  { pattern: 'no one understands', weight: 2 },
  // Burden
  { pattern: 'burden', weight: 3 },
  { pattern: 'i\'m a burden', weight: 5 },
  { pattern: 'burden to everyone', weight: 5 },
  // Escape
  { pattern: 'escape', weight: 2 },
  { pattern: 'want out', weight: 3 },
  { pattern: 'way out', weight: 3 },
  { pattern: 'only way out', weight: 5 },
  // Finality
  { pattern: 'goodbye', weight: 2 },
  { pattern: 'final goodbye', weight: 5 },
  { pattern: 'last message', weight: 4 },
  { pattern: 'won\'t be here', weight: 4 },
  // Exhaustion (less specific than "tired of life" - moved from CRISIS patterns)
  { pattern: /\b(tired|sick|done)\s+(of|with)\s+(everything|all\s+of\s+this)/i, weight: 3 },
  { pattern: 'so tired of everything', weight: 3 },
  { pattern: 'sick of everything', weight: 3 },
  { pattern: 'done with everything', weight: 3 },
];

// Threshold for soft signals to trigger CRISIS mode
const SOFT_SIGNAL_CRISIS_THRESHOLD = 8;
const SOFT_SIGNAL_SUPPORTIVE_THRESHOLD = 4;

// Mental health keywords - SUPPORTIVE mode
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
  'grieving',
  'panic',
  'panic attack',
  'worried',
  'struggling',
  'mental health',
  'therapy',
  'therapist',
  'counseling',
  'counselor',
  'burnout',
  'burnt out',
  'exhausted',
  'breaking down',
  'falling apart',
  'crying',
  'can\'t sleep',
  'insomnia',
  'nightmares',
  'trauma',
  'ptsd',
  'flashback',
  'triggered',
  'self-esteem',
  'hate myself',
  'worthless',
  'failure',
  'ashamed',
  'guilt',
  'regret',
];

class InputAnalyzer {
  async analyze(text: string): Promise<InputAnalysis> {
    const lowerText = text.toLowerCase();

    // Layer 1: Check explicit crisis keywords (highest priority)
    for (const keyword of EXPLICIT_CRISIS_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        return {
          intent: 'MENTAL_HEALTH',
          riskLevel: 'HIGH',
          safetyFlags: ['CRISIS_KEYWORD_MATCH'],
          suggestedMode: 'CRISIS',
          modeReason: 'EXPLICIT_CRISIS_KEYWORD',
        };
      }
    }

    // Layer 2: Check crisis patterns (regex)
    for (const pattern of CRISIS_PATTERNS) {
      if (pattern.test(lowerText)) {
        return {
          intent: 'MENTAL_HEALTH',
          riskLevel: 'HIGH',
          safetyFlags: ['CRISIS_PATTERN_MATCH'],
          suggestedMode: 'CRISIS',
          modeReason: 'CRISIS_PATTERN_MATCH',
        };
      }
    }

    // Layer 3: Calculate soft signal score
    let softSignalScore = 0;
    const matchedSignals: string[] = [];

    for (const signal of SOFT_CRISIS_SIGNALS) {
      const matches =
        typeof signal.pattern === 'string'
          ? lowerText.includes(signal.pattern)
          : signal.pattern.test(lowerText);

      if (matches) {
        softSignalScore += signal.weight;
        matchedSignals.push(
          typeof signal.pattern === 'string'
            ? signal.pattern
            : signal.pattern.source
        );
      }
    }

    // High soft signal score → CRISIS
    if (softSignalScore >= SOFT_SIGNAL_CRISIS_THRESHOLD) {
      return {
        intent: 'MENTAL_HEALTH',
        riskLevel: 'HIGH',
        safetyFlags: ['SOFT_SIGNALS_ELEVATED', ...matchedSignals.slice(0, 3)],
        suggestedMode: 'CRISIS',
        modeReason: 'SOFT_SIGNALS_CRISIS_THRESHOLD',
      };
    }

    // Medium soft signal score → SUPPORTIVE
    if (softSignalScore >= SOFT_SIGNAL_SUPPORTIVE_THRESHOLD) {
      return {
        intent: 'MENTAL_HEALTH',
        riskLevel: 'MEDIUM',
        safetyFlags: matchedSignals.slice(0, 3),
        suggestedMode: 'SUPPORTIVE',
        modeReason: 'SOFT_SIGNALS_ELEVATED',
      };
    }

    // Layer 4: Check mental health keywords → SUPPORTIVE
    for (const keyword of MENTAL_HEALTH_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        return {
          intent: 'MENTAL_HEALTH',
          riskLevel: 'MEDIUM',
          safetyFlags: [],
          suggestedMode: 'SUPPORTIVE',
          modeReason: 'MENTAL_HEALTH_KEYWORD',
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

  /**
   * Enhanced analysis that runs semantic classifier for LOW/MEDIUM risk cases
   * Semantic classifier can escalate risk but never downgrade below rule-based minimum
   */
  async analyzeWithSemantic(text: string): Promise<InputAnalysis> {
    // Step 1: Run rule-based analysis first
    const ruleAnalysis = await this.analyze(text);

    // Step 2: If rule-based returns HIGH or CRISIS, skip semantic (already at max)
    if (ruleAnalysis.riskLevel === 'HIGH' || ruleAnalysis.suggestedMode === 'CRISIS') {
      return {
        ...ruleAnalysis,
        semanticUsed: false,
      };
    }

    // Step 3: Check if semantic classifier is enabled
    if (!SemanticRiskClassifier.isEnabled()) {
      return {
        ...ruleAnalysis,
        semanticUsed: false,
      };
    }

    // Step 4: Run semantic classification for LOW or MEDIUM risk
    const semanticResult = await SemanticRiskClassifier.classify(text);

    // Step 5: Merge results conservatively (semantic can escalate, not downgrade)
    const finalRiskLevel = this.getMaxRiskLevel(ruleAnalysis.riskLevel, semanticResult.riskLevel);
    const finalMode = this.getModeForRisk(finalRiskLevel);

    // Determine mode reason based on escalation
    let finalModeReason = ruleAnalysis.modeReason;
    const riskWasEscalated = this.riskLevelToNumber(semanticResult.riskLevel) > 
                             this.riskLevelToNumber(ruleAnalysis.riskLevel);
    
    if (riskWasEscalated) {
      finalModeReason = 'LLM_SEMANTIC_ESCALATION';
    } else if (semanticResult.riskLevel === ruleAnalysis.riskLevel) {
      finalModeReason = 'LLM_SEMANTIC_CONFIRM';
    }

    // Combine safety flags (dedupe)
    const combinedFlags = [...new Set([
      ...ruleAnalysis.safetyFlags,
      ...semanticResult.safetyFlags,
    ])];

    return {
      intent: semanticResult.intent !== 'UNKNOWN' ? semanticResult.intent : ruleAnalysis.intent,
      riskLevel: finalRiskLevel,
      safetyFlags: combinedFlags,
      suggestedMode: finalMode,
      modeReason: finalModeReason,
      rationale: semanticResult.rationale,
      semanticUsed: true,
      semanticRiskLevel: semanticResult.riskLevel,
      semanticModeReason: semanticResult.suggestedMode === finalMode 
        ? 'SEMANTIC_AGREED' 
        : riskWasEscalated 
          ? 'SEMANTIC_ESCALATED' 
          : 'SEMANTIC_RULE_TOOK_PRECEDENCE',
    };
  }

  /**
   * Convert risk level to numeric for comparison
   */
  private riskLevelToNumber(risk: RiskLevel): number {
    switch (risk) {
      case 'LOW': return 0;
      case 'MEDIUM': return 1;
      case 'HIGH': return 2;
    }
  }

  /**
   * Get the higher of two risk levels
   */
  private getMaxRiskLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
    const aNum = this.riskLevelToNumber(a);
    const bNum = this.riskLevelToNumber(b);
    
    if (aNum >= bNum) return a;
    return b;
  }

  /**
   * Map risk level to mode
   */
  private getModeForRisk(risk: RiskLevel): Mode {
    switch (risk) {
      case 'HIGH': return 'CRISIS';
      case 'MEDIUM': return 'SUPPORTIVE';
      case 'LOW': return 'NORMAL';
    }
  }
}

export default new InputAnalyzer();

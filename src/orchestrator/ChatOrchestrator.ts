import { Mode, ChatMessage } from '../types';
import InputAnalyzer from '../services/InputAnalyzer';
import PromptBuilder from '../services/PromptBuilder';
import ResponseValidator from '../services/ResponseValidator';
import ConversationStore from '../stores/ConversationStore';
import LLMClient from '../llm/LLMClient';

const PROMPT_VERSION = 'v1.0';
const RECENT_MESSAGES_LIMIT = 20;

// Crisis-safe template: conservative, encourages off-platform help, no step-by-step instructions
const CRISIS_SAFE_MESSAGE =
  "I'm really sorry you're feeling this way. You don't have to go through this alone. " +
  "If you're in immediate danger or might act on these thoughts, please contact your local emergency number right now. " +
  "If you can, reach out to someone you trust or a local crisis hotline. " +
  "If you tell me what country you're in, I can help you find the right support options.";

type OrchestratorInput = {
  conversationId: string;
  userId?: string;
  userMessage: string;
};

type OrchestratorOutput = {
  assistantMessage: string;
  mode: Mode;
  safetyFlags: string[];
  promptVersion: string;
  llmProvider: string;
  modeReason: string;
};

class ChatOrchestrator {
  async handleUserMessage(input: OrchestratorInput): Promise<OrchestratorOutput> {
    const { conversationId, userMessage } = input;

    // Step 1: Analyze input for intent and risk
    const analysis = await InputAnalyzer.analyze(userMessage);
    const mode = analysis.suggestedMode;

    // CRISIS PATH: Skip LLM, return crisis-safe template immediately
    if (mode === 'CRISIS') {
      const timestamp = new Date().toISOString();
      const assistantMessage = CRISIS_SAFE_MESSAGE;

      // Append to conversation store
      await ConversationStore.append(conversationId, {
        role: 'user',
        content: userMessage,
        timestamp,
      });
      await ConversationStore.append(conversationId, {
        role: 'assistant',
        content: assistantMessage,
        timestamp,
      });

      return {
        assistantMessage,
        mode: 'CRISIS',
        safetyFlags: analysis.safetyFlags,
        promptVersion: PROMPT_VERSION,
        llmProvider: 'none',
        modeReason: analysis.modeReason,
      };
    }

    // NORMAL/SUPPORTIVE PATH: Full pipeline

    // Step 2: Get recent conversation history
    const recentMessages = await ConversationStore.getRecent(
      conversationId,
      RECENT_MESSAGES_LIMIT
    );

    // Step 3: Build prompt with context
    const builtPrompt = await PromptBuilder.build({
      mode,
      recentMessages,
      userMessage,
      promptVersion: PROMPT_VERSION,
    });

    // Step 4: Call LLM
    const llmResponse = await LLMClient.generate({
      messages: builtPrompt.messages,
      temperature: 0.7,
      maxTokens: 500,
    });

    // Step 5: Validate response and get safe text
    const validation = await ResponseValidator.validate(
      mode,
      userMessage,
      llmResponse.text
    );

    const assistantMessage = validation.isSafe
      ? llmResponse.text
      : (validation.sanitizedText || llmResponse.text);

    // Step 6: Append messages to conversation store
    const timestamp = new Date().toISOString();

    const userChatMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp,
    };

    const assistantChatMessage: ChatMessage = {
      role: 'assistant',
      content: assistantMessage,
      timestamp,
    };

    await ConversationStore.append(conversationId, userChatMessage);
    await ConversationStore.append(conversationId, assistantChatMessage);

    // Step 7: Combine safety flags from analysis and validation
    const combinedSafetyFlags = [
      ...analysis.safetyFlags,
      ...validation.safetyFlags,
    ];

    return {
      assistantMessage,
      mode,
      safetyFlags: combinedSafetyFlags,
      promptVersion: PROMPT_VERSION,
      llmProvider: LLMClient.getProvider(),
      modeReason: analysis.modeReason,
    };
  }
}

export default new ChatOrchestrator();


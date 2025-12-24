import OpenAI from 'openai';
import { LLMRequest, LLMResponse } from '../types';

class LLMClient {
  private provider: string | null = null;
  private openaiClient: OpenAI | null = null;
  private openaiModel: string | null = null;
  private initialized = false;

  /**
   * Lazy initialization - reads env vars on first use
   * This allows dotenv to load before we read the config
   */
  private ensureInitialized(): void {
    if (this.initialized) return;
    
    this.provider = process.env.LLM_PROVIDER || 'stub';
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (this.provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'OPENAI_API_KEY environment variable is required when LLM_PROVIDER=openai'
        );
      }
      this.openaiClient = new OpenAI({ apiKey });
    }
    
    this.initialized = true;
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    this.ensureInitialized();
    
    if (this.provider === 'openai') {
      return this.generateOpenAI(req);
    }
    return this.generateStub(req);
  }

  private async generateStub(req: LLMRequest): Promise<LLMResponse> {
    // Extract the last user message for context
    const lastUserMessage = [...req.messages]
      .reverse()
      .find((m) => m.role === 'user');

    const userContext = lastUserMessage
      ? lastUserMessage.content.slice(0, 50)
      : 'your thoughts';

    // Simulate a short supportive response
    const responses = [
      `I hear you when you share about ${userContext}. It takes courage to open up. How are you feeling right now?`,
      `Thank you for sharing that with me. I'm here to listen. Would you like to tell me more about what's on your mind?`,
      `I appreciate you trusting me with this. It sounds like you're going through something meaningful. How can I support you?`,
    ];

    const text = responses[Math.floor(Math.random() * responses.length)];
    return { text };
  }

  private async generateOpenAI(req: LLMRequest): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await this.openaiClient.chat.completions.create({
      model: this.openaiModel!,
      messages: req.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 500,
    });

    const text = completion.choices[0]?.message?.content || '';
    return { text };
  }

  getProvider(): string {
    this.ensureInitialized();
    return this.provider!;
  }
}

export default new LLMClient();

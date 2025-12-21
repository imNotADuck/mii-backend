import { ChatMessage } from '../types';

const MAX_MESSAGES_PER_CONVERSATION = 30;

class ConversationStore {
  private store: Map<string, ChatMessage[]> = new Map();

  async getRecent(conversationId: string, limit: number): Promise<ChatMessage[]> {
    const messages = this.store.get(conversationId) || [];
    return messages.slice(-limit);
  }

  async append(conversationId: string, message: ChatMessage): Promise<void> {
    const messages = this.store.get(conversationId) || [];
    messages.push(message);

    // Cap to MAX_MESSAGES_PER_CONVERSATION
    if (messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      messages.splice(0, messages.length - MAX_MESSAGES_PER_CONVERSATION);
    }

    this.store.set(conversationId, messages);
  }

  // For testing/debugging
  clear(conversationId?: string): void {
    if (conversationId) {
      this.store.delete(conversationId);
    } else {
      this.store.clear();
    }
  }
}

export default new ConversationStore();


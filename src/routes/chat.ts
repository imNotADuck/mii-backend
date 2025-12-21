import { Router, Request, Response, NextFunction } from 'express';
import { ChatRequest, ChatResponse } from '../types';
import ChatOrchestrator from '../orchestrator/ChatOrchestrator';
import ConversationStore from '../stores/ConversationStore';

const router = Router();

// GET /v1/chat/history?conversationId=...
router.get(
  '/history',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversationId = req.query.conversationId as string;

      if (!conversationId) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'conversationId query parameter is required',
        });
        return;
      }

      const messages = await ConversationStore.getRecent(conversationId, 20);

      res.json({
        conversationId,
        messages,
        count: messages.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/send',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();

    try {
      const body = req.body as Partial<ChatRequest>;

      // Validate required fields
      if (!body.conversationId || typeof body.conversationId !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'conversationId is required and must be a string',
        });
        return;
      }

      if (!body.message || typeof body.message !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'message is required and must be a string',
        });
        return;
      }

      // Process through orchestrator
      const result = await ChatOrchestrator.handleUserMessage({
        conversationId: body.conversationId,
        userId: body.userId,
        userMessage: body.message,
      });

      const latencyMs = Date.now() - startTime;

      // Log mode and latency
      console.log(
        `[Chat] conversationId=${body.conversationId} mode=${result.mode} latencyMs=${latencyMs}`
      );

      // Build response
      const response: ChatResponse = {
        conversationId: body.conversationId,
        assistantMessage: result.assistantMessage,
        mode: result.mode,
        metadata: {
          latencyMs,
          safetyFlags: result.safetyFlags,
          promptVersion: result.promptVersion,
          llmProvider: result.llmProvider,
          modeReason: result.modeReason,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;


# LLM Mental Health Assistant – Backend (Thesis Project)

## Context
This backend is part of a bachelor thesis titled:

AI-Powered Mental Health Assistant: Applying Large Language Models for Empathetic Conversations on Mobile Devices

The goal of this backend is to act as a backend orchestration layer between a mobile client (Flutter) and a hosted Large Language Model (LLM).

The contribution of this project is system-level design, not model training.

## Scope (Non-Negotiable)

### This system DOES:
- Provide a REST API for chat-based interaction
- Orchestrate LLM calls using prompts
- Enforce empathy-oriented and safety-aware behavior
- Maintain short-term conversation memory
- Handle crisis-related inputs conservatively

### This system DOES NOT:
- Perform clinical diagnosis
- Provide medical or medication advice
- Replace professional mental health care
- Train or fine-tune any AI models
- Store long-term psychological profiles

## Architecture Overview

Mobile App (Flutter)
  |
  v
Backend API (Node.js + Express)
  - InputAnalyzer
  - ConversationStore
  - PromptBuilder
  - Safety / Crisis Detection
  - LLMClient (swappable)
  - ResponseValidator
  |
  v
Hosted LLM API

## Technical Decisions
- Backend framework: Node.js + Express + TypeScript
- Memory: in-memory store (for prototype)
- LLM access: external API (OpenAI or stub)
- Architecture: modular, LLM-agnostic

## Design Principles
- Safety over intelligence
- Deterministic control over probabilistic output
- Simplicity over overengineering
- Mobile-first latency awareness

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env

# Run in development mode
npm run dev

# Build for production
npm run build
npm start
```

## API Endpoints

| Method | Endpoint         | Description                    |
|--------|------------------|--------------------------------|
| GET    | `/health`        | Health check                   |
| POST   | `/v1/chat/send`  | Send a message, receive reply  |

### POST /v1/chat/send

Request:
```json
{
  "conversationId": "abc123",
  "message": "I've been feeling anxious lately"
}
```

Response:
```json
{
  "conversationId": "abc123",
  "assistantMessage": "...",
  "mode": "SUPPORTIVE",
  "metadata": {
    "latencyMs": 42,
    "safetyFlags": [],
    "promptVersion": "v1.0"
  }
}
```
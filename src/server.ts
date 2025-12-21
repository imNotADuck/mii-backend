import express, { Request, Response, NextFunction } from 'express';
import chatRouter from './routes/chat';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/v1/chat', chatRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message);

  // Don't leak internal error details in production
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(500).json({
    error: 'Internal Server Error',
    message: isDev ? err.message : 'An unexpected error occurred',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Mental Health Assistant API running on port ${PORT}`);
  console.log(`[Server] LLM Provider: ${process.env.LLM_PROVIDER || 'stub'}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
});

export default app;


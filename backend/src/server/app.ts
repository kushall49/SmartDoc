import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { logger } from '@/lib/logger';

// Import route modules
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/document.routes';
import chatRoutes from './routes/chat.routes';
import searchRoutes from './routes/search.routes';
import intelligenceRoutes from './routes/intelligence.routes';
import fileRoutes from './routes/file.routes';
import auditRoutes from './routes/audit.routes';
import healthRoutes from './routes/health.routes';

export function createApp(): Express {
  const app = express();

  // 1. CORS Configuration (Gotcha 3: Auth across two origins)
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173', // Vite standard dev port
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive in local development
        }
      },
      credentials: true, // Allow cookies and authorization headers across origins
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 2. Body Parsing & Cookies
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. Request Logger
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.url}`);
    next();
  });

  // 4. API Route Mounts
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/intelligence', intelligenceRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/audit', auditRoutes);

  // 5. Global Error Handling Middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled server error', { error: err?.message || String(err) });

    if (err?.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: 'File exceeds maximum upload size of 10 MB.',
      });
      return;
    }

    res.status(err?.status || 500).json({
      success: false,
      error: err?.message || 'Internal server error',
    });
  });

  return app;
}

export default createApp;


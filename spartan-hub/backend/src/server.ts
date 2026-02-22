import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config';
import planRoutes from './routes/planRoutes';
import aiRoutes from './routes/aiRoutes';
import testRoutes from './routes/testRoutes';
import testApiKeysRoutes from './routes/testApiKeys';
import authRoutes from './routes/authRoutes';
import tokenRoutes from './routes/tokenRoutes';
import csrfRoutes from './routes/csrfRoutes';
import fitnessRoutes from './routes/fitnessRoutes';
import googleFitRoutes from './routes/googleFitRoutes';
import healthRoutes from './routes/healthRoutes';
import cacheRoutes from './routes/cacheRoutes';
import activityRoutes from './routes/activityRoutes';
import mlInjuryPredictionRoutes from './routes/mlInjuryPredictionRoutes';
import mlTrainingRecommenderRoutes from './routes/mlTrainingRecommenderRoutes';
import mlPerformanceForecastRoutes from './routes/mlPerformanceForecastRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import batchJobRoutes from './routes/batchJobRoutes';
import notificationRoutes from './routes/notificationRoutes';
import personalizationRoutes from './routes/personalizationRoutes';
import { CacheService, getCacheService } from './services/cacheService';
import { getBatchJobService } from './services/batchJobService';
import { getNotificationService } from './services/notificationService';
import { getPersonalizationService } from './services/personalizationService';
import { getMLForecastingService } from './services/mlForecastingService';
import mlForecastingRoutes from './routes/mlForecastingRoutes';
import { getCoachVitalisService } from './services/coachVitalisService';
import coachVitalisRoutes from './routes/coachVitalisRoutes';
import coachVitalisRAGRoutes from './routes/coachVitalisRAGRoutes';
import advancedRAGRoutes from './routes/advancedRAGRoutes';
import { getRAGDocumentService } from './services/ragDocumentService';
import { getVectorStoreService } from './services/vectorStoreService';
import { getCitationService } from './services/citationService';
import ragRoutes from './routes/ragRoutes';
import knowledgeBaseRoutes from './routes/knowledgeBaseRoutes';
import formAnalysisRoutes from './routes/formAnalysisRoutes';
import dailyBriefingRoutes from './routes/dailyBriefingRoutes';
import nutritionPhotoRoutes from './routes/nutritionPhotoRoutes';
import accountabilityRoutes from './routes/accountabilityRoutes';
import voiceCoachingRoutes from './routes/voiceCoachingRoutes';
import geneticProfileRoutes from './routes/geneticProfileRoutes';
import largeActionModelRoutes from './routes/largeActionModelRoutes';
import marketplaceRoutes from './routes/marketplaceRoutes';
import challengesRoutes from './routes/challengesRoutes';
import brainOrchestrationRoutes from './routes/brainOrchestrationRoutes';
import coachRoutes from './routes/coachRoutes';
import terraWebhookRoutes from './routes/terraWebhookRoutes';
import { initializeDatabase } from './config/database';
import { globalErrorHandler, handleUnhandledRejection, handleUncaughtException } from './utils/errorHandler';
import { globalRateLimit, authRateLimit, apiRateLimit, heavyApiRateLimit, getRateLimit, writeRateLimit } from './middleware/rateLimitMiddleware';
import { logger } from './utils/logger';
import { requestLogger, errorLogger } from './middleware/loggingMiddleware';
import { apmService } from './utils/apmService';
import { metricsCollector, metricsEndpoint } from './middleware/metricsMiddleware';
import { alertService } from './services/alertService';
import { getAlertConfig } from './config/alertConfig';
import { rateLimitAlertMiddleware } from './middleware/alertMiddleware';
import { slaMonitoringService } from './services/slaMonitoringService';
import { tracingService } from './utils/tracingService';
import { tracingMiddleware } from './middleware/tracingMiddleware';
import { sessionMiddleware } from './middleware/sessionMiddleware';
import i18nMiddleware from './middleware/i18nMiddleware';
import { cleanupService } from './services/cleanupService';
import { setupCsrfProtection as setupModernCsrfProtection, csrfErrorHandler } from './middleware/csrfProtection';
import {
  getDatabasePassword,
  getApiKey,
  getOllamaApiKey,
  getJwtSecret,
  getSessionSecret
} from './utils/secrets';
import { AuthenticatedRequest } from './types/index';
import { createServer } from 'http';
import { socketManager } from './realtime/socketManager';
import { getDailyBrainCycleJob } from './jobs/dailyBrainCycleJob';
import { getMLValidationJob } from './jobs/mlValidationJob';
import { getCriticalSignalMonitor } from './services/criticalSignalMonitor';

// Handle uncaught exceptions and unhandled promise rejections
handleUnhandledRejection();
handleUncaughtException();

// Load environment variables
dotenv.config();

// Check if we should use PostgreSQL
const usePostgres = process.env.DATABASE_TYPE === 'postgres';

// Initialize database
logger.debug('Initializing database', {
  context: 'serverInit',
  metadata: {
    dbPathConfigured: Boolean(process.env.DB_PATH)
  }
});
initializeDatabase();

// Initialize PostgreSQL database if needed
if (usePostgres) {
  logger.info('🐘 Initializing PostgreSQL database schema...', { context: 'postgresInit' });
  import('./scripts/initPostgresSchema')
    .then(module => {
      const initializePostgresSchema = module.default;
      initializePostgresSchema()
        .then(() => {
          logger.info('✅ PostgreSQL database schema initialized successfully', { context: 'postgresInit' });
        })
        .catch(error => {
          logger.error('❌ Error initializing PostgreSQL database schema:', { context: 'postgresInit', metadata: { error } });
        });
    })
    .catch(error => {
      logger.error('❌ Error importing PostgreSQL schema initialization:', { context: 'postgresInit', metadata: { error } });
    });
}

// Initialize alert service with configuration
const alertConfig = getAlertConfig();
alertService.updateConfig(alertConfig);

// Log server startup
logger.startup({
  context: 'serverStartup',
  metadata: {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT
  }
});

// Constants for payload limits
const MAX_JSON_SIZE = process.env.MAX_JSON_SIZE || '10mb';
const MAX_URL_ENCODED_SIZE = process.env.MAX_URL_ENCODED_SIZE || '10mb';

export const app: Application = express();
const PORT = process.env.PORT || 3001;

// Global rate limiting - applies to all requests
app.use(globalRateLimit);
app.use(rateLimitAlertMiddleware);

// Request logging middleware
app.use(requestLogger);

// Metrics collection middleware
app.use(metricsCollector);

// Tracing middleware
app.use(tracingMiddleware);

// Cookie parser middleware - MUST be before session and i18n middleware
app.use(cookieParser());

// CSRF protection middleware - MUST be after cookieParser and before routes
if (process.env.NODE_ENV !== 'test') {
  setupModernCsrfProtection(app as any);
}

// Session middleware
app.use(sessionMiddleware);

// i18n middleware
app.use(i18nMiddleware);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' }
}));

// Add X-XSS-Protection header explicitly for legacy support/tests
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Compression middleware - must be applied before other middleware that might modify response content
app.use(compression());

// CORS configuration with validation and whitelist support
const corsOrigin = process.env.CORS_ORIGIN;
const allowedOrigins = process.env.ALLOWED_ORIGINS;

function validateCorsOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  if (origin === '*') {
    logger.error('SECURITY ALERT: CORS_ORIGIN cannot be "*" when credentials are enabled. This exposes cookies and tokens to any origin.', {
      context: 'corsSecurity'
    });
    return false;
  }
  return true;
}

function getCorsWhitelist(): string[] | string {
  if (allowedOrigins) {
    const whitelist = allowedOrigins.split(',').map(o => o.trim());
    logger.info('CORS whitelist configured', {
      context: 'corsSecurity',
      metadata: { allowedOrigins: whitelist }
    });
    return whitelist;
  }
  if (corsOrigin && validateCorsOrigin(corsOrigin)) {
    return corsOrigin;
  }
  logger.warn('No valid CORS_ORIGIN configured, using localhost default', {
    context: 'corsSecurity'
  });
  return ['http://localhost:5173', 'http://localhost:3002'];
}

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const whitelistOrSingle = getCorsWhitelist();

    if (Array.isArray(whitelistOrSingle)) {
      if (!origin || whitelistOrSingle.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request from unauthorized origin', {
          context: 'corsSecurity',
          metadata: { origin, allowedOrigins: whitelistOrSingle }
        });
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      if (!origin || origin === whitelistOrSingle) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request from unauthorized origin', {
          context: 'corsSecurity',
          metadata: { origin, allowedOrigin: whitelistOrSingle }
        });
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// Payload limits
app.use(express.json({
  limit: MAX_JSON_SIZE,
  strict: true
}));
app.use(express.urlencoded({
  extended: true,
  limit: MAX_URL_ENCODED_SIZE,
  parameterLimit: 10000
}));

// Input sanitization middleware - applied to all requests
import { sanitizeRequestInput } from './middleware/inputSanitizationMiddleware';
app.use(sanitizeRequestInput);

// Import auth middleware
import { verifyJWT, requireRole, ROLES } from './middleware/auth';

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Spartan Hub API Documentation'
}));

// Routes with appropriate rate limiting
app.use('/auth', authRateLimit, authRoutes);
app.use('/tokens', authRateLimit, tokenRoutes);
app.use('/api', csrfRoutes); // CSRF token endpoint

// Apply different rate limits based on request method for API routes
app.use('/fitness', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, fitnessRoutes);

app.use('/fitness', googleFitRoutes);

app.use('/plan', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, planRoutes);

app.use('/ai', heavyApiRateLimit, aiRoutes); // AI endpoints are resource intensive

app.use('/test', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, testRoutes);

app.use('/test', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, testApiKeysRoutes);

app.use('/health', getRateLimit, healthRoutes); // Health check is read-only

app.use('/cache', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, cacheRoutes);

app.use('/api/ml', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, mlInjuryPredictionRoutes); // ML Injury Prediction routes

app.use('/api/ml', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, mlTrainingRecommenderRoutes); // ML Training Recommendations routes

app.use('/api/ml', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, mlPerformanceForecastRoutes); // ML Performance Forecast routes

app.use('/activity', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, activityRoutes);

app.use('/api/analytics', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, analyticsRoutes); // Analytics endpoints for readiness, recovery, trends, recommendations

app.use('/api/admin/batch-jobs', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, batchJobRoutes); // Batch job management endpoints

app.use('/api/notifications', rateLimitAlertMiddleware, notificationRoutes); // Notification management endpoints

app.use('/api/personalization', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, personalizationRoutes); // Personalization and user-specific algorithm adaptation

app.use('/api/ml-forecasting', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, mlForecastingRoutes); // ML-based readiness forecasting and predictions
app.use('/api/vitalis', coachVitalisRoutes); // Coach Vitalis bio-feedback decision engine

// Brain Orchestrator routes (daily cycle, decisions, feedback)
app.use('/api/brain', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, brainOrchestrationRoutes); // Brain Orchestrator decision management

// Terra Webhook routes (no rate limiting - signature based)
app.use('/api/webhooks/terra', terraWebhookRoutes); // Terra API webhook ingestion

// Coach Vitalis RAG Integration routes
app.use('/api/vitalis/rag', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, coachVitalisRAGRoutes); // KB-powered RAG recommendations with Coach Vitalis

// Advanced RAG routes (decomposition, re-ranking, caching, feedback)
app.use('/api/vitalis/rag', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, advancedRAGRoutes); // Advanced RAG features: decomposition, re-ranking, caching

// RAG (Retrieval-Augmented Generation) routes for scientific citations
app.use('/api/rag', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, ragRoutes);

// Knowledge Base routes for fitness knowledge management
app.use('/api/kb', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, knowledgeBaseRoutes);

app.use('/api/form-analysis', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, formAnalysisRoutes);

// Fase 2: Daily Briefing AI Routes
app.use('/api/briefings', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, dailyBriefingRoutes);

// Fase 2: Nutrition Photo Analysis Routes
app.use('/api/nutrition', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, nutritionPhotoRoutes);

// Fase 2: Accountability Matching Routes
app.use('/api/accountability', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, accountabilityRoutes);

// Fase 3: Voice Coaching Routes
app.use('/api/voice-coaching', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, voiceCoachingRoutes);

// Fase 4: Genetic Profile Routes
app.use('/api/genetics', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, geneticProfileRoutes);

// Fase 5: Large Action Model Routes
app.use('/api/lam', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, largeActionModelRoutes);

// Fase 6: Expert Marketplace Routes
app.use('/api/marketplace', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, marketplaceRoutes);

// Fase 6: Team Challenges Routes
app.use('/api/challenges', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, challengesRoutes);

// Fase C: Enterprise Coach Dashboard Routes
app.use('/api/coach', (req, res, next) => {
  if (req.method === 'GET') {
    return getRateLimit(req, res, next);
  } else {
    return writeRateLimit(req, res, next);
  }
}, coachRoutes);

// Metrics endpoint (secured)
app.get('/metrics', getRateLimit, verifyJWT, requireRole([ROLES.ADMIN]), metricsEndpoint);

// Protected governance routes
app.get('/api/governance/health', getRateLimit, verifyJWT, requireRole([ROLES.USER, ROLES.REVIEWER, ROLES.ADMIN, ROLES.MODERATOR]), (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Governance health check passed',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/governance/security', getRateLimit, verifyJWT, requireRole([ROLES.REVIEWER, ROLES.ADMIN]), (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Security endpoint accessible',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint - uses comprehensive health service
app.get('/health', getRateLimit, async (req: Request, res: Response) => {
  try {
    const health = await import('./services/healthService');
    const systemHealth = await health.getSystemHealth();

    // Set appropriate HTTP status code based on overall health
    const statusCode = systemHealth.status === 'healthy' ? 200 :
      systemHealth.status === 'degraded' ? 200 : 503;

    logger.info('Comprehensive health check completed', {
      context: 'healthCheck',
      metadata: {
        overallStatus: systemHealth.status,
        timestamp: new Date().toISOString(),
        port: PORT
      }
    });

    res.status(statusCode).json({
      status: systemHealth.status,
      message: 'Backend server and dependencies are running',
      timestamp: new Date().toISOString(),
      port: PORT,
      services: systemHealth.services,
      uptime: systemHealth.uptime
    });
  } catch (error) {
    logger.error('Error during health check:', {
      context: 'healthCheck',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      port: PORT
    });
  }
});

// API endpoints
app.get('/api', (req: Request, res: Response) => {
  logger.info('API info endpoint accessed', {
    context: 'apiInfo'
  });

  res.status(200).json({
    message: 'Spartan Fitness Backend API',
    version: '1.0.0',
    endpoints: {
      plan: {
        assign: 'POST /plan/asignar',
        getUserPlans: 'GET /plan/asignar/:userId',
        commitment: 'POST /plan/compromiso',
        getCommitment: 'GET /plan/compromiso/:userId/:routineId'
      },
      ai: {
        getAlert: 'POST /ai/alert/:userId',
        getAlertFromBody: 'POST /ai/alert',
        generateDecision: 'POST /ai/decision/:userId',
        healthCheck: 'GET /ai/health'
      },
      test: {
        createUser: 'POST /test/create-user',
        createRoutine: 'POST /test/create-routine',
        recordWorkout: 'POST /test/record-workout',
        getUser: 'GET /test/user/:userId',
        getRoutine: 'GET /test/routine/:routineId',
        getWorkouts: 'GET /test/workouts/:userId',
        getChronicLoad: 'GET /test/chronic-load/:userId',
        recordActivity: 'POST /test/activity',
        getUserActivity: 'GET /test/activity/:userId',
        apiKeys: 'GET /test/api-keys'
      },
      activity: {
        add: 'POST /activity',
        getHistory: 'GET /activity/history',
        getActivity: 'GET /activity/:activityId'
      },
      health: 'GET /health',
      metrics: 'GET /metrics'
    }
  });
});

// New approach for serving static files
logger.info('Attempting to serve static files...', {
  context: 'staticFiles',
  metadata: {
    dirname: __dirname,
    cwd: process.cwd(),
    execPath: process.execPath
  }
});

// Function to find the correct static files path
function findStaticPath(): string | null {
  const possiblePaths = [
    // Standard development path
    path.join(__dirname, '../dist'),
    // PKG snapshot path
    '/snapshot/dist',
    // Relative to current working directory
    path.join(process.cwd(), 'dist'),
    // One level up from current working directory
    path.join(process.cwd(), '../dist'),
    // Executable directory
    path.join(path.dirname(process.execPath), 'dist'),
    // Executable directory + backend
    path.join(path.dirname(process.execPath), 'backend', 'dist')
  ];

  for (const staticPath of possiblePaths) {
    logger.debug(`Checking path: ${staticPath}`, {
      context: 'staticFiles'
    });

    try {
      if (fs.existsSync(staticPath) && fs.statSync(staticPath).isDirectory()) {
        logger.info(`Found static files at: ${staticPath}`, {
          context: 'staticFiles'
        });
        // Check if index.html exists in this directory
        const indexPath = path.join(staticPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          logger.info(`Found index.html at: ${indexPath}`, {
            context: 'staticFiles'
          });
          return staticPath;
        }
      }
    } catch (err: any) {
      logger.warn(`Error checking path ${staticPath}: ${err.message}`, {
        context: 'staticFiles'
      });
    }
  }

  logger.error('Could not find static files directory', {
    context: 'staticFiles'
  });
  return null;
}

// Serve static files if found - MUST be after all API routes
const staticPath = findStaticPath();
if (staticPath) {
  logger.info(`Serving static files from: ${staticPath}`, {
    context: 'staticFiles'
  });
  app.use(express.static(staticPath));

  // Serve index.html for all routes (client-side routing) - ONLY for non-API routes
  app.get('*', (req: Request, res: Response) => {
    // Don't serve static files for API routes
    if (req.path.startsWith('/api') ||
      req.path.startsWith('/auth') ||
      req.path.startsWith('/tokens') ||
      req.path.startsWith('/fitness') ||
      req.path.startsWith('/plan') ||
      req.path.startsWith('/ai') ||
      req.path.startsWith('/test') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/cache') ||
      req.path.startsWith('/activity') ||
      req.path.startsWith('/metrics')) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }
    res.sendFile(path.join(staticPath!, 'index.html'));
  });
} else {
  logger.warn('Static files not found, skipping static file serving', {
    context: 'staticFiles'
  });
}

// 404 Handler for API routes - Must be before error logger
app.use((req: Request, res: Response, next: NextFunction) => {
  // If the request is for an API endpoint and hasn't been handled, return 404
  if (req.path.startsWith('/api') ||
    req.path.startsWith('/auth') ||
    req.path.startsWith('/tokens') ||
    req.path.startsWith('/fitness') ||
    req.path.startsWith('/plan') ||
    req.path.startsWith('/ai') ||
    req.path.startsWith('/test') ||
    req.path.startsWith('/health') ||
    req.path.startsWith('/cache') ||
    req.path.startsWith('/activity') ||
    req.path.startsWith('/metrics')) {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.originalUrl
    });
    return;
  }
  next();
});

// CSRF error handler - MUST be before global error handler
app.use(csrfErrorHandler);

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use(globalErrorHandler);

// Export a function to start server instead of starting it immediately
export const startServer = async () => {
  // Initialize cache service
  const cacheService = getCacheService();
  try {
    await cacheService.initialize();
    const cacheHealth = await cacheService.getHealth();
    logger.info('Cache service initialized', {
      context: 'serverStart',
      metadata: {
        enabled: cacheHealth.enabled,
        connected: cacheHealth.connected,
        host: cacheHealth.host,
        port: cacheHealth.port
      }
    });
  } catch (error) {
    logger.warn('Cache service initialization failed - continuing without cache', {
      context: 'serverStart',
      metadata: {
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
  }

  // Initialize batch job service
  const batchJobService = getBatchJobService();
  const notificationService = getNotificationService();
  const personalizationService = getPersonalizationService();
  const mlForecastingService = getMLForecastingService();
  const coachVitalisService = getCoachVitalisService();
  try {
    await batchJobService.initialize();
    const batchHealth = await batchJobService.getHealth();
    logger.info('Batch job service initialized', {
      context: 'serverStart',
      metadata: {
        active: batchHealth.active,
        jobCount: batchHealth.jobCount,
        activeJobs: batchHealth.activeJobs,
        config: {
          dailyAnalytics: batchHealth.config.enableDailyAnalytics,
          cacheWarming: batchHealth.config.enableCacheWarming,
          maintenance: batchHealth.config.enableDatabaseMaintenance,
        }
      }
    });
  } catch (error) {
    logger.warn('Batch job service initialization failed - continuing without batch jobs', {
      context: 'serverStart',
      metadata: {
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
  }

  // Initialize notification service
  try {
    // Notification service initialized in constructor
    // await notificationService.initialize();
    logger.info('Notification service initialized', {
      context: 'serverStart',
      metadata: {
        channels: ['email', 'push', 'in-app'],
        templates: 8
      }
    });
  } catch (error) {
    logger.warn('Notification service initialization failed - continuing without notifications', {
      context: 'serverStart',
      metadata: {
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
  }

  // Initialize personalization service
  try {
    await personalizationService.initialize();
    logger.info('Personalization service initialized', {
      context: 'serverStart',
      metadata: {
        features: [
          'User baseline calculation',
          'Personalized thresholds',
          'Response pattern analysis',
          'Score personalization'
        ]
      }
    });
  } catch (error) {
    logger.warn('Personalization service initialization failed - continuing without personalization', {
      context: 'serverStart',
      metadata: {
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
  }

  // Initialize ML forecasting service
  try {
    await mlForecastingService.initialize();
    const modelMetadata = mlForecastingService.getModelMetadata();
    logger.info('MLForecastingService started successfully', {
      context: 'mlForecastingInit',
      metadata: { modelVersion: modelMetadata?.version, modelType: modelMetadata?.modelType }
    });

    await coachVitalisService.initialize();
    logger.info('CoachVitalisService initialized successfully', {
      context: 'coachVitalisInit',
      metadata: { service: 'Coach Vitalis Bio-Feedback Engine', rules: 5, endpoints: 8 }
    });

    // Initialize RAG services
    const ragDocumentService = getRAGDocumentService();
    const vectorStoreService = getVectorStoreService();
    const citationService = getCitationService();

    // Get the database instance
    const { getDatabase } = await import('./database/databaseManager');
    const db = getDatabase();

    await ragDocumentService.initialize(db);
    await citationService.initialize(db);
    
    // Initialize vector store (OpenAI removed)
    await vectorStoreService.initialize({
      qdrantHost: process.env.QDRANT_HOST || 'localhost',
      qdrantPort: parseInt(process.env.QDRANT_PORT || '6333', 10),
      qdrantApiKey: process.env.QDRANT_API_KEY
    });
    
    logger.info('RAG Services initialized successfully', {
      context: 'ragInit',
      metadata: {
        services: ['DocumentService', 'VectorStore', 'CitationService'],
        vectorDimension: 1536,
        embeddingModel: 'local-deterministic-mock'
      }
    });
    logger.info('ML Forecasting service initialized', {
      context: 'serverStart',
      metadata: {
        modelVersion: modelMetadata.version,
        modelType: modelMetadata.modelType,
        features: [
          'Readiness forecasting (7-day)',
          'Injury probability prediction',
          'Fatigue estimation',
          'Training load suggestion'
        ]
      }
    });
  } catch (error) {
    logger.warn('ML Forecasting or RAG service initialization warning - continuing without some features', {
      context: 'serverStart',
      metadata: {
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
  }

  // Start cleanup service
  cleanupService.startCleanup();

  // Initialize APM monitoring
  apmService.initialize(app);

  // Initialize SLA monitoring
  slaMonitoringService.initialize();

  // Initialize distributed tracing
  tracingService.initialize();

  // Create HTTP server for socket.io integration
  const httpServer = createServer(app);

  // Initialize WebSocket (Socket.io)
  socketManager.initializeWithHttpServer(httpServer);
  logger.info('WebSocket server initialized', { context: 'serverStart' });

  // Initialize and start daily brain cycle job
  const dailyBrainCycleJob = getDailyBrainCycleJob();
  dailyBrainCycleJob.start();
  logger.info('Daily brain cycle job started', { context: 'serverStart' });

  // Initialize and start ML validation job
  const mlValidationJob = getMLValidationJob();
  mlValidationJob.start();
  logger.info('ML validation job started', { context: 'serverStart' });

  // Initialize critical signal monitoring
  const criticalSignalMonitor = getCriticalSignalMonitor();
  logger.info('Critical signal monitor initialized', { context: 'serverStart' });

  // Start server
  return httpServer.listen(PORT, () => {
    logger.startup({
      context: 'serverStart',
      message: `🚀 Server running on port ${PORT}`,
      metadata: {
        port: PORT,
        environment: process.env.NODE_ENV,
        pid: process.pid
      }
    });

    // Log instance information for load balancing
    if (process.env.INSTANCE_ID) {
      logger.info(`Instance ID: ${process.env.INSTANCE_ID}`, {
        context: 'loadBalancing'
      });
    }

    // Start system metrics collection
    logger.info('📊 Starting system metrics collection', {
      context: 'metrics'
    });
  });
};

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully', { context: 'shutdown' });

  try {
    // Stop daily brain cycle job
    getDailyBrainCycleJob().stop();

    // Stop ML validation job
    getMLValidationJob().stop();
    
    // Stop critical signal monitor
    getCriticalSignalMonitor().stopAll();

    // Close WebSocket connections
    socketManager.closeAll();

    // Shutdown tracing service
    await tracingService.shutdown();

    logger.info('Server shutdown complete', { context: 'shutdown' });
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      context: 'shutdown',
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    });
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully', { context: 'shutdown' });

  try {
    // Stop daily brain cycle job
    getDailyBrainCycleJob().stop();

    // Stop ML validation job
    getMLValidationJob().stop();
    
    // Stop critical signal monitor
    getCriticalSignalMonitor().stopAll();

    // Close WebSocket connections
    socketManager.closeAll();

    // Shutdown tracing service
    await tracingService.shutdown();

    logger.info('Server shutdown complete', { context: 'shutdown' });
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      context: 'shutdown',
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    });
    process.exit(1);
  }
});

// Only start the server if this file is run directly (not imported)
if (require.main === module) {
  startServer();
}

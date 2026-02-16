import csurf from 'csurf';
import { Express, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// CSRF protection middleware using cookie-based tokens, HttpOnly + SameSite=Lax
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
  }
});

// Middleware para manejar errores CSRF
export const csrfErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err.code !== 'EBADCSRFTOKEN') {
    next(err);
    return;
  }

  logger.warn('CSRF token invalid or missing', {
    context: 'csrf',
    metadata: { path: req.path, method: req.method }
  });

  res.status(403).json({
    success: false,
    message: 'Invalid CSRF token',
    code: 'INVALID_CSRF_TOKEN'
  });
};

// Función para integrar CSRF protection en la aplicación
export const setupCsrfProtection = (app: Express): void => {
  // Exclude safe/technical routes
  app.use((req, res, next) => {
    const path = req.path;
    if (
      path.startsWith('/api/webhooks') ||
      path.startsWith('/auth/') ||
      path.startsWith('/health') ||
      path.startsWith('/metrics')
    ) {
      return next();
    }
    return csrfProtection(req, res, next);
  });

  // Expose a route to fetch a CSRF token
  app.get('/api/csrf-token', (req: Request, res: Response) => {
    try {
      const token = req.csrfToken();
      // Token is also set via cookie by csurf; return in body for clients
      res.status(200).json({ csrfToken: token });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to issue CSRF token' });
    }
  });
};

// Exportar middleware para uso en rutas específicas
export default csrfProtection;

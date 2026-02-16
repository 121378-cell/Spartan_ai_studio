import { Request, Response, NextFunction } from 'express';
import { hasPermission, hasRoleOrHigher } from '../utils/roleUtils';
import { ROLES } from '../middleware/auth';

// Middleware to check if user has specific permissions
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(401).json({ 
        success: false,
        message: 'Authentication required. Please log in to continue.' 
      });
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({ 
        success: false,
        message: `Access denied. You need the '${permission}' permission to perform this action.` 
      });
      return;
    }

    next();
  };
};

// Middleware to check if user has a specific role or higher
export const requireRoleOrHigher = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(401).json({ 
        success: false,
        message: 'Authentication required. Please log in to continue.' 
      });
      return;
    }

    if (!hasRoleOrHigher(req.user.role, requiredRole)) {
      res.status(403).json({ 
        success: false,
        message: `Access denied. You need to be at least '${requiredRole}' to perform this action.` 
      });
      return;
    }

    next();
  };
};

// Middleware to check if user is admin
export const requireAdmin = () => {
  return requireRoleOrHigher(ROLES.ADMIN);
};

// Middleware to check if user is reviewer or admin
export const requireReviewer = () => {
  return requireRoleOrHigher(ROLES.REVIEWER);
};

// Middleware to check if user is a regular user or higher
export const requireUser = () => {
  return requireRoleOrHigher(ROLES.USER);
};
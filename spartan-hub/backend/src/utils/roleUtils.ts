import { ROLES, Role } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export { ROLES, type Role };

/**
 * Middleware to require a specific role or higher
 */
export const requireRole = (requiredRole: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const {user} = (req as any);
    
    if (!user || !user.role) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const rolesToCheck = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const isAuthorized = rolesToCheck.some(role => hasRoleOrHigher(user.role, role));

    if (!isAuthorized) {
      logger.warn('Access denied: insufficient permissions', {
        context: 'auth',
        metadata: { userId: user.id, userRole: user.role, requiredRole }
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Define role hierarchies and permissions
export const ROLE_HIERARCHY = {
  [ROLES.USER]: 1,
  [ROLES.REVIEWER]: 2,
  [ROLES.MODERATOR]: 2.5,
  [ROLES.ADMIN]: 3
};

// Define permissions for each role
export const ROLE_PERMISSIONS = {
  [ROLES.USER]: [
    'read_profile',
    'update_profile',
    'read_workouts',
    'create_workouts',
    'read_plans',
    'assign_plans'
  ],
  [ROLES.REVIEWER]: [
    'read_profile',
    'update_profile',
    'read_workouts',
    'create_workouts',
    'read_plans',
    'assign_plans',
    'review_content',
    'moderate_comments'
  ],
  [ROLES.MODERATOR]: [
    'read_profile',
    'update_profile',
    'read_workouts',
    'create_workouts',
    'read_plans',
    'assign_plans',
    'review_content',
    'moderate_comments',
    'manage_users'
  ],
  [ROLES.ADMIN]: [
    'read_profile',
    'update_profile',
    'read_workouts',
    'create_workouts',
    'read_plans',
    'assign_plans',
    'review_content',
    'moderate_comments',
    'manage_users',
    'manage_roles',
    'system_administration',
    'view_system_logs'
  ]
};

// Check if a user has a specific permission
export const hasPermission = (userRole: string, permission: string): boolean => {
  const permissions = ROLE_PERMISSIONS[userRole as Role] || [];
  return permissions.includes(permission);
};

// Check if a user has a higher or equal role compared to another role
export const hasRoleOrHigher = (userRole: string, requiredRole: string): boolean => {
  const userRoleLevel = ROLE_HIERARCHY[userRole as Role] || 0;
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole as Role] || 0;
  return userRoleLevel >= requiredRoleLevel;
};

// Get all permissions for a role
export const getPermissionsForRole = (role: string): string[] => {
  return ROLE_PERMISSIONS[role as Role] || [];
};

// Check if user has admin privileges
export const isAdmin = (userRole: string): boolean => {
  return userRole === ROLES.ADMIN;
};

// Check if user has reviewer privileges
export const isReviewer = (userRole: string): boolean => {
  return userRole === ROLES.REVIEWER || userRole === ROLES.ADMIN;
};

// Check if user has basic user privileges
export const isUser = (userRole: string): boolean => {
  return userRole === ROLES.USER || userRole === ROLES.REVIEWER || userRole === ROLES.ADMIN;
};
import { describe, it, expect } from '@jest/globals';
import { hasPermission, hasRoleOrHigher, getPermissionsForRole, isAdmin, isReviewer, isUser } from '../utils/roleUtils';
import { ROLES } from '../middleware/auth';

describe('Role Utilities Tests', () => {
  describe('hasPermission', () => {
    it('should return true for user with correct permission', () => {
      expect(hasPermission(ROLES.USER, 'read_profile')).toBe(true);
    });

    it('should return false for user without permission', () => {
      expect(hasPermission(ROLES.USER, 'manage_users')).toBe(false);
    });

    it('should return true for admin with any permission', () => {
      expect(hasPermission(ROLES.ADMIN, 'manage_users')).toBe(true);
      expect(hasPermission(ROLES.ADMIN, 'read_profile')).toBe(true);
    });
  });

  describe('hasRoleOrHigher', () => {
    it('should return true when user has exact required role', () => {
      expect(hasRoleOrHigher(ROLES.USER, ROLES.USER)).toBe(true);
    });

    it('should return true when user has higher role', () => {
      expect(hasRoleOrHigher(ROLES.ADMIN, ROLES.USER)).toBe(true);
    });

    it('should return false when user has lower role', () => {
      expect(hasRoleOrHigher(ROLES.USER, ROLES.ADMIN)).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return correct permissions for user role', () => {
      const userPermissions = getPermissionsForRole(ROLES.USER);
      expect(userPermissions).toContain('read_profile');
      expect(userPermissions).toContain('update_profile');
      expect(userPermissions).toContain('read_workouts');
      expect(userPermissions).toContain('create_workouts');
      expect(userPermissions).toContain('read_plans');
      expect(userPermissions).toContain('assign_plans');
    });

    it('should return correct permissions for admin role', () => {
      const adminPermissions = getPermissionsForRole(ROLES.ADMIN);
      expect(adminPermissions).toContain('manage_users');
      expect(adminPermissions).toContain('system_administration');
      expect(adminPermissions).toContain('view_system_logs');
    });
  });

  describe('Role-specific functions', () => {
    it('should correctly identify admin users', () => {
      expect(isAdmin(ROLES.ADMIN)).toBe(true);
      expect(isAdmin(ROLES.USER)).toBe(false);
    });

    it('should correctly identify reviewer users', () => {
      expect(isReviewer(ROLES.ADMIN)).toBe(true);
      expect(isReviewer(ROLES.REVIEWER)).toBe(true);
      expect(isReviewer(ROLES.USER)).toBe(false);
    });

    it('should correctly identify regular users', () => {
      expect(isUser(ROLES.ADMIN)).toBe(true);
      expect(isUser(ROLES.REVIEWER)).toBe(true);
      expect(isUser(ROLES.USER)).toBe(true);
    });
  });
});

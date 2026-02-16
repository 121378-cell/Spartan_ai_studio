import { describe, it, expect, beforeEach } from '@jest/globals';
import { SessionModel } from '../models/Session';

describe('Session Cleanup Verification', () => {
  beforeEach(async () => {
    // Clean up sessions before each test
    await SessionModel.clear();
  });

  it('should clear all sessions successfully', async () => {
    // This test verifies that the SessionModel.clear() method works
    // and doesn't throw any errors
    await expect(SessionModel.clear()).resolves.not.toThrow();
  });
});
import { describe, it, expect, beforeEach } from '@jest/globals';
import { TokenService } from '../tokenService';
import { RefreshTokenModel } from '../../models/RefreshToken';

describe('TokenService', () => {
  beforeEach(() => {
    RefreshTokenModel.clearAll();
  });

  it('generates a refresh token and stores only the hash', async () => {
    const svc = TokenService.getInstance();
    const userId = 'user123';
    const role = 'user';
    const sessionId = 'session123';

    const refreshToken = await svc.generateRefreshToken(userId, role, sessionId);
    expect(typeof refreshToken).toBe('string');

    const stored = await RefreshTokenModel.findByToken(refreshToken);
    expect(stored).not.toBeNull();
    expect(stored?.tokenHash).toBeDefined();
    // Ensure plain token is not kept
    expect(stored?.token).toBeUndefined();
    expect(stored?.isActive).toBe(true);
  });
});

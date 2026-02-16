import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TokenService, tokenService } from '../services/tokenService';
import { SessionModel } from '../models/Session';
import { RefreshTokenModel } from '../models/RefreshToken';
import jwt from 'jsonwebtoken';
import config from '../config/configService';
import { ROLES } from '../middleware/auth';

// Mock response factory for tests
export function createMockRes() {
  const mockRes = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
  return mockRes as unknown as import('express').Response;
}

const JWT_SECRET = config.get('jwtSecret');
const JWT_ALGO = config.get('jwtAlgo') || 'HS256';

// Ensure JWT configuration is valid for tests
if (typeof JWT_SECRET !== 'string') {
  throw new Error('JWT_SECRET must be a string for tests');
}
if (typeof JWT_ALGO !== 'string') {
  throw new Error('JWT_ALGO must be a string for tests');
}

describe('TokenService Tests', () => {
  const testUserId = 'test-user-123';
  const testRole = ROLES.USER;
  const testSessionId = 'test-session-123';

  beforeEach(async () => {
    // Clear in-memory token storage and sessions
    await SessionModel.clear();
    RefreshTokenModel.clearAll();
  });

  afterEach(async () => {
    // Cleanup
    await SessionModel.clear();
    RefreshTokenModel.clearAll();
  });

  describe('Token Generation', () => {
    it('should generate valid access token with correct payload', () => {
      const accessToken = tokenService.generateAccessToken(testUserId, testRole, testSessionId);

      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');

      // Verify token structure
      const decoded = jwt.verify(accessToken, JWT_SECRET, { algorithms: [JWT_ALGO as jwt.Algorithm] }) as { userId: string; role: string; sessionId: string; tokenType: string; exp: number; iat: number; jti: string; };
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.role).toBe(testRole);
      expect(decoded.sessionId).toBe(testSessionId);
      expect(decoded.tokenType).toBe('access');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.jti).toBeDefined(); // JWT ID
    });

    it('should generate access token that expires in 15 minutes', () => {
      const accessToken = tokenService.generateAccessToken(testUserId, testRole, testSessionId);
      const decoded = jwt.verify(accessToken, JWT_SECRET, { algorithms: [JWT_ALGO as jwt.Algorithm] }) as { userId: string; role: string; sessionId: string; tokenType: string; exp: number; iat: number; jti: string; };

      const expirationTime = decoded.exp - decoded.iat;
      expect(expirationTime).toBe(15 * 60); // 15 minutes in seconds
    });

    it('should generate valid refresh token with database persistence', async () => {
      const refreshToken = await tokenService.generateRefreshToken(testUserId, testSessionId, testRole);

      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');

      // Verify token structure
      const decoded = jwt.verify(refreshToken, JWT_SECRET, { algorithms: [JWT_ALGO as jwt.Algorithm] }) as { userId: string; sessionId: string; tokenType: string; exp: number; iat: number; jti: string; };
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.sessionId).toBe(testSessionId);
      expect(decoded.tokenType).toBe('refresh');

      // Verify database persistence
      const storedToken = await RefreshTokenModel.findByToken(refreshToken);
      expect(storedToken).toBeDefined();
      expect(storedToken?.userId).toBe(testUserId);
      expect(storedToken?.sessionId).toBe(testSessionId);
      expect(storedToken?.isActive).toBe(true);
    });

    it('should generate refresh token that expires in 7 days', async () => {
      const refreshToken = await tokenService.generateRefreshToken(testUserId, testSessionId, testRole);
      const decoded = jwt.verify(refreshToken, JWT_SECRET, { algorithms: [JWT_ALGO as jwt.Algorithm] }) as { userId: string; sessionId: string; tokenType: string; exp: number; iat: number; jti: string; };

      const expirationTime = decoded.exp - decoded.iat;
      expect(expirationTime).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });

    it('should generate token pair with matching session IDs', async () => {
      const tokenPair = await tokenService.generateTokenPair(testUserId, testRole, testSessionId);

      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();

      const accessDecoded = jwt.verify(tokenPair.accessToken, JWT_SECRET, { algorithms: [JWT_ALGO as jwt.Algorithm] }) as { userId: string; role: string; sessionId: string; tokenType: string; exp: number; iat: number; jti: string; };
      const refreshDecoded = jwt.verify(tokenPair.refreshToken, JWT_SECRET, { algorithms: [JWT_ALGO as jwt.Algorithm] }) as { userId: string; sessionId: string; tokenType: string; exp: number; iat: number; jti: string; };

      expect(accessDecoded.sessionId).toBe(testSessionId);
      expect(refreshDecoded.sessionId).toBe(testSessionId);
      expect(accessDecoded.userId).toBe(testUserId);
      expect(refreshDecoded.userId).toBe(testUserId);
    });

    it('should generate unique JWT IDs for each token', async () => {
      const token1 = tokenService.generateAccessToken(testUserId, testRole, testSessionId);
      const token2 = tokenService.generateAccessToken(testUserId, testRole, testSessionId);

      const decoded1 = jwt.verify(token1, JWT_SECRET, { algorithms: [JWT_ALGO as jwt.Algorithm] }) as { userId: string; role: string; sessionId: string; tokenType: string; exp: number; iat: number; jti: string; };
      const decoded2 = jwt.verify(token2, JWT_SECRET, { algorithms: [JWT_ALGO as jwt.Algorithm] }) as { userId: string; role: string; sessionId: string; tokenType: string; exp: number; iat: number; jti: string; };

      expect(decoded1.jti).not.toBe(decoded2.jti);
    });
  });

  describe('Access Token Verification', () => {
    it('should verify valid access token', async () => {
      const accessToken = tokenService.generateAccessToken(testUserId, testRole, testSessionId);

      // Create session for token
      await SessionModel.create({
        userId: testUserId,
        token: accessToken,
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true
      });

      const payload = await tokenService.verifyAccessToken(accessToken);
      expect(payload.userId).toBe(testUserId);
      expect(payload.role).toBe(testRole);
      expect(payload.sessionId).toBe(testSessionId);
      expect(payload.tokenType).toBe('access');
    });

    it('should reject invalid access token signature', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';

      await expect(tokenService.verifyAccessToken(invalidToken)).rejects.toThrow('Invalid access token');
    });

    it('should reject expired access token', async () => {
      const expiredToken = jwt.sign(
        {
          userId: testUserId,
          role: testRole,
          sessionId: testSessionId,
          tokenType: 'access',
          exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        },
        JWT_SECRET,
        { algorithm: JWT_ALGO as jwt.Algorithm }
      );

      await expect(tokenService.verifyAccessToken(expiredToken)).rejects.toThrow('Invalid access token');
    });

    it('should reject refresh token when verifying access token (type mismatch)', async () => {
      const refreshToken = await tokenService.generateRefreshToken(testUserId, testSessionId, testRole);

      await expect(tokenService.verifyAccessToken(refreshToken)).rejects.toThrow('Invalid access token');
    });

    it('should reject access token with inactive session', async () => {
      const accessToken = tokenService.generateAccessToken(testUserId, testRole, testSessionId);

      // Create inactive session
      const session = await SessionModel.create({
        userId: testUserId,
        token: accessToken,
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 3600000),
        isActive: false
      });

      await expect(tokenService.verifyAccessToken(accessToken)).rejects.toThrow('Invalid access token');
    });

    it('should reject access token with no session', async () => {
      const accessToken = tokenService.generateAccessToken(testUserId, testRole, testSessionId);

      // No session created
      await expect(tokenService.verifyAccessToken(accessToken)).rejects.toThrow('Invalid access token');
    });
  });

  describe('Refresh Token Verification', () => {
    it('should verify valid refresh token', async () => {
      const refreshToken = await tokenService.generateRefreshToken(testUserId, testSessionId, testRole);

      const payload = await tokenService.verifyRefreshToken(refreshToken);
      expect(payload.userId).toBe(testUserId);
      expect(payload.sessionId).toBe(testSessionId);
      expect(payload.tokenType).toBe('refresh');
    });

    it('should reject access token when verifying refresh token (type mismatch)', async () => {
      const accessToken = tokenService.generateAccessToken(testUserId, testRole, testSessionId);

      await expect(tokenService.verifyRefreshToken(accessToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should reject inactive refresh token', async () => {
      const refreshToken = await tokenService.generateRefreshToken(testUserId, testSessionId, testRole);

      // Deactivate the refresh token
      await RefreshTokenModel.deactivateByToken(refreshToken);

      await expect(tokenService.verifyRefreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should reject expired refresh token', async () => {
      const tokenId = 'test-token-id';
      const expiredToken = jwt.sign(
        {
          userId: testUserId,
          role: testRole,
          sessionId: testSessionId,
          tokenType: 'refresh'
        },
        JWT_SECRET,
        { algorithm: JWT_ALGO as jwt.Algorithm, expiresIn: '1s', jwtid: tokenId }
      );

      // Create expired refresh token in database
      await RefreshTokenModel.create({
        id: tokenId,
        userId: testUserId,
        sessionId: testSessionId,
        token: expiredToken,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        isActive: true,
        createdAt: new Date()
      });

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      await expect(tokenService.verifyRefreshToken(expiredToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should reject refresh token not in database', async () => {
      const tokenId = 'non-existent-id';
      const refreshToken = jwt.sign(
        {
          userId: testUserId,
          role: testRole,
          sessionId: testSessionId,
          tokenType: 'refresh'
        },
        JWT_SECRET,
        { algorithm: JWT_ALGO as jwt.Algorithm, jwtid: tokenId }
      );

      await expect(tokenService.verifyRefreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Token Rotation', () => {
    it('should successfully rotate refresh token', async () => {
      const oldRefreshToken = await tokenService.generateRefreshToken(testUserId, testSessionId, testRole);

      const newTokenPair = await tokenService.rotateRefreshToken(oldRefreshToken);

      expect(newTokenPair.accessToken).toBeDefined();
      expect(newTokenPair.refreshToken).toBeDefined();
      expect(newTokenPair.refreshToken).not.toBe(oldRefreshToken);

      // Verify new tokens are valid
      const accessDecoded = jwt.verify(newTokenPair.accessToken, JWT_SECRET, { algorithms: [JWT_ALGO as jwt.Algorithm] }) as { userId: string; role: string; sessionId: string; tokenType: string; exp: number; iat: number; jti: string; };
      const refreshDecoded = jwt.verify(newTokenPair.refreshToken, JWT_SECRET, { algorithms: [JWT_ALGO as jwt.Algorithm] }) as { userId: string; sessionId: string; tokenType: string; exp: number; iat: number; jti: string; };

      expect(accessDecoded.userId).toBe(testUserId);
      expect(refreshDecoded.userId).toBe(testUserId);
    });

    it('should deactivate old refresh token after rotation', async () => {
      const oldRefreshToken = await tokenService.generateRefreshToken(testUserId, testSessionId, testRole);

      await tokenService.rotateRefreshToken(oldRefreshToken);

      // Old token should be deactivated
      const oldTokenRecord = await RefreshTokenModel.findByToken(oldRefreshToken);
      expect(oldTokenRecord?.isActive).toBe(false);
    });

    it('should reject rotation with invalid refresh token', async () => {
      const invalidToken = 'invalid.refresh.token';

      await expect(tokenService.rotateRefreshToken(invalidToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should reject rotation with already used refresh token', async () => {
      const refreshToken = await tokenService.generateRefreshToken(testUserId, testSessionId, testRole);

      // First rotation succeeds
      await tokenService.rotateRefreshToken(refreshToken);

      // Second rotation with same token should fail
      await expect(tokenService.rotateRefreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Token Revocation', () => {
    it('should revoke specific refresh token', async () => {
      const refreshToken = await tokenService.generateRefreshToken(testUserId, testSessionId, testRole);

      await tokenService.revokeRefreshToken(refreshToken);

      const tokenRecord = await RefreshTokenModel.findByToken(refreshToken);
      expect(tokenRecord?.isActive).toBe(false);
    });

    it('should revoke all user tokens', async () => {
      const token1 = await tokenService.generateRefreshToken(testUserId, 'session-1', testRole);
      const token2 = await tokenService.generateRefreshToken(testUserId, 'session-2', testRole);
      const token3 = await tokenService.generateRefreshToken(testUserId, 'session-3', testRole);

      await tokenService.revokeAllUserTokens(testUserId);

      const record1 = await RefreshTokenModel.findByToken(token1);
      const record2 = await RefreshTokenModel.findByToken(token2);
      const record3 = await RefreshTokenModel.findByToken(token3);

      expect(record1?.isActive).toBe(false);
      expect(record2?.isActive).toBe(false);
      expect(record3?.isActive).toBe(false);
    });

    it('should verify revoked tokens cannot be used', async () => {
      const refreshToken = await tokenService.generateRefreshToken(testUserId, testSessionId, testRole);

      await tokenService.revokeRefreshToken(refreshToken);

      await expect(tokenService.verifyRefreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should not affect other users tokens when revoking', async () => {
      const user1Token = await tokenService.generateRefreshToken('user-1', 'session-1', testRole);
      const user2Token = await tokenService.generateRefreshToken('user-2', 'session-2', testRole);

      await tokenService.revokeAllUserTokens('user-1');

      const user1Record = await RefreshTokenModel.findByToken(user1Token);
      const user2Record = await RefreshTokenModel.findByToken(user2Token);

      expect(user1Record?.isActive).toBe(false);
      expect(user2Record?.isActive).toBe(true);
    });
  });

  describe('Cookie Management', () => {
    it('should set secure cookies with correct flags', () => {
      const mockRes = createMockRes();

      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      tokenService.setSecureCookies(mockRes, accessToken, refreshToken);

      expect(mockRes.cookie).toHaveBeenCalledTimes(2);

      // Verify access token cookie
      expect(mockRes.cookie).toHaveBeenCalledWith('access_token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
        path: '/'
      });

      // Verify refresh token cookie
      expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });
    });

    it('should clear cookies properly', () => {
      const mockRes = createMockRes();

      tokenService.clearSecureCookies(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('access_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/'
      });

      expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/'
      });
    });
  });
});

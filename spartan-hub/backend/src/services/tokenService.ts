import { Response } from 'express';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { SessionModel } from '../models/Session';
import { RefreshTokenModel } from '../models/RefreshToken';
import config from '../config/configService';

interface JWTPayload {
  userId: string;
  role: string;
  sessionId: string;
  tokenType: 'access' | 'refresh';
  exp?: number;
  iat?: number;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class TokenService {
  private static instance: TokenService;

  private constructor() { }

  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  // Generate access token (short-lived: 15 minutes)
  public generateAccessToken(userId: string, role: string, sessionId: string): string {
    const payload: JWTPayload = {
      userId,
      role,
      sessionId,
      tokenType: 'access'
    };

    const jwtSecret = config.get('jwtSecret');
    const jwtAlgo = config.get('jwtAlgo');

    if (!jwtSecret || typeof jwtSecret !== 'string') {
      throw new Error('JWT secret is not configured or invalid');
    }

    return jwt.sign(payload, jwtSecret, {
      algorithm: (jwtAlgo as string || 'HS256') as jwt.Algorithm,
      expiresIn: '15m',
      jwtid: uuidv4()
    });
  }

  // Generate refresh token (long-lived: 7 days)
  public async generateRefreshToken(userId: string, role: string, sessionId: string): Promise<string> {
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const payload: JWTPayload = {
      userId,
      role, // Include role in refresh token for restoration during rotation
      sessionId,
      tokenType: 'refresh'
    };

    const jwtSecret = config.get('jwtSecret');
    const jwtAlgo = config.get('jwtAlgo');

    if (!jwtSecret || typeof jwtSecret !== 'string') {
      throw new Error('JWT secret is not configured or invalid');
    }

    const refreshToken = jwt.sign(payload, jwtSecret, {
      algorithm: (jwtAlgo as string || 'HS256') as jwt.Algorithm,
      expiresIn: '7d',
      jwtid: tokenId
    });

    // Store refresh token in database
    await RefreshTokenModel.create({
      id: tokenId,
      userId,
      sessionId,
      token: refreshToken,
      expiresAt,
      isActive: true,
      createdAt: new Date()
    });

    return refreshToken;
  }

  // Generate token pair
  public async generateTokenPair(userId: string, role: string, sessionId: string): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(userId, role, sessionId);
    const refreshToken = await this.generateRefreshToken(userId, role, sessionId);

    return { accessToken, refreshToken };
  }

  // Verify access token
  public async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const jwtSecret = config.get('jwtSecret');
      const jwtAlgo = config.get('jwtAlgo');

      if (!jwtSecret || typeof jwtSecret !== 'string') {
        throw new Error('JWT secret is not configured or invalid');
      }

      const payload = jwt.verify(token, jwtSecret, {
        algorithms: [(jwtAlgo as string || 'HS256') as jwt.Algorithm]
      }) as unknown as JWTPayload;

      if (payload.tokenType !== 'access') {
        throw new Error('Invalid token type');
      }

      // Check if session is still active
      const session = await SessionModel.findByToken(token);
      if (!session || !session.isActive) {
        throw new Error('Session not found or inactive');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  // Verify refresh token
  public async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
      const jwtSecret = config.get('jwtSecret');
      const jwtAlgo = config.get('jwtAlgo');

      if (!jwtSecret || typeof jwtSecret !== 'string') {
        throw new Error('JWT secret is not configured or invalid');
      }

      const payload = jwt.verify(token, jwtSecret, {
        algorithms: [(jwtAlgo as string || 'HS256') as jwt.Algorithm]
      }) as unknown as JWTPayload;

      if (payload.tokenType !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token is still active in database
      const refreshTokenRecord = await RefreshTokenModel.findByToken(token);
      if (!refreshTokenRecord || !refreshTokenRecord.isActive) {
        throw new Error('Refresh token not found or inactive');
      }

      // Check if refresh token has expired
      if (refreshTokenRecord.expiresAt < new Date()) {
        await RefreshTokenModel.deactivate(refreshTokenRecord.id);
        throw new Error('Refresh token expired');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Rotate refresh token (issue new refresh token and invalidate old one)
  public async rotateRefreshToken(oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = await this.verifyRefreshToken(oldRefreshToken);

    // Deactivate old refresh token
    await RefreshTokenModel.deactivateByToken(oldRefreshToken);

    // Generate new token pair
    return this.generateTokenPair(payload.userId, payload.role, payload.sessionId);
  }

  // Revoke all refresh tokens for a user
  public async revokeAllUserTokens(userId: string): Promise<void> {
    await RefreshTokenModel.deactivateAllUserTokens(userId);
  }

  // Revoke specific refresh token
  public async revokeRefreshToken(token: string): Promise<void> {
    await RefreshTokenModel.deactivateByToken(token);
  }

  // Set secure cookies with proper flags
  public setSecureCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Access token cookie (15 minutes)
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction, // True in production, false in dev/test
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    // Refresh token cookie (7 days)
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction, // True in production, false in dev/test
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });
  }

  // Clear secure cookies
  public clearSecureCookies(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/'
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/'
    });
  }
}

// Export singleton instance
export const tokenService = TokenService.getInstance();
export default tokenService;

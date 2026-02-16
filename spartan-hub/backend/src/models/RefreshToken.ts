import { RefreshToken } from '../types';
import crypto from 'crypto';

// In-memory storage for testing
const refreshTokens: Map<string, RefreshToken> = new Map(); // keyed by tokenHash

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export class RefreshTokenModel {
  static async create(data: {
    id: string;
    userId: string;
    sessionId: string;
    token: string;
    expiresAt: Date;
    isActive: boolean;
    createdAt: Date;
  }): Promise<RefreshToken> {
    const tokenHash = hashToken(data.token);
    const refreshToken: RefreshToken = {
      id: data.id,
      userId: data.userId,
      sessionId: data.sessionId,
      tokenHash,
      expiresAt: data.expiresAt,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: new Date()
    };

    // Store in memory
    refreshTokens.set(tokenHash, refreshToken);

    return refreshToken;
  }

  static async findByToken(token: string): Promise<RefreshToken | null> {
    const tokenHash = hashToken(token);
    const refreshToken = refreshTokens.get(tokenHash);
    return refreshToken || null;
  }

  static async deactivate(id: string): Promise<void> {
    // Find token by id and deactivate
    for (const [tokenHash, data] of refreshTokens.entries()) {
      if (data.id === id) {
        data.isActive = false;
        data.updatedAt = new Date();
        refreshTokens.set(tokenHash, data);
        break;
      }
    }
  }

  static async deactivateByToken(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const refreshToken = refreshTokens.get(tokenHash);
    if (refreshToken) {
      refreshToken.isActive = false;
      refreshToken.updatedAt = new Date();
      refreshTokens.set(tokenHash, refreshToken);
    }
  }

  static async deactivateAllUserTokens(userId: string): Promise<void> {
    for (const [tokenHash, data] of refreshTokens.entries()) {
      if (data.userId === userId) {
        data.isActive = false;
        data.updatedAt = new Date();
        refreshTokens.set(tokenHash, data);
      }
    }
  }

  static async cleanupExpired(): Promise<void> {
    const now = new Date();
    for (const [tokenHash, data] of refreshTokens.entries()) {
      if (data.expiresAt < now) {
        refreshTokens.delete(tokenHash);
      }
    }
  }

  // Helper method for tests to clear all tokens
  static clearAll(): void {
    refreshTokens.clear();
  }
}

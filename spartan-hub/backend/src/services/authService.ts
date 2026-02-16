import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/configService';

type Role = 'user' | 'admin' | 'reviewer' | 'moderator' | string;

interface TokenOptions {
  scope?: string;
  nonce?: string;
  version?: number;
}

interface TokenPayload {
  userId: string;
  role?: Role;
  scope?: string;
  nonce?: string;
  version?: number;
  iat?: number;
  exp?: number;
}

interface SessionData {
  token: string;
  createdAt: number;
}

/**
 * Minimal AuthService used for security tests.
 * Provides JWT generation/verification, scope & role checks,
 * refresh with versioning, blacklist, nonce replay protection, and
 * simple in-memory session management. Not persisted.
 */
export class AuthService {
  private static instance: AuthService;
  private readonly secret: string;
  private readonly algo: jwt.Algorithm;
  private readonly tokenRefreshUse: Set<string>;
  private readonly blacklist: Set<string>;
  private readonly usedNonces: Set<string>;
  private readonly sessions: Map<string, SessionData>;

  private constructor() {
    const fallback = 'test_secret_key_256_chars_long_for_testing_purposes_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const cfgSecret = config.get('jwtSecret');
    const secret = typeof cfgSecret === 'string' ? cfgSecret : (process.env.JWT_SECRET || fallback);
    const algo = (config.get('jwtAlgo') as jwt.Algorithm) || 'HS256';
    this.secret = secret;
    this.algo = algo;
    this.tokenRefreshUse = new Set();
    this.blacklist = new Set();
    this.usedNonces = new Set();
    this.sessions = new Map();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  resetForTests(): void {
    this.tokenRefreshUse.clear();
    this.blacklist.clear();
    this.usedNonces.clear();
    this.sessions.clear();
  }

  generateNonce(): string {
    const nonce = crypto.randomBytes(12).toString('hex');
    return nonce;
  }

  generateToken(payload: { userId: string; role?: Role }, options: TokenOptions = {}): string {
    if (options.nonce && this.usedNonces.has(options.nonce)) {
      throw new Error('Nonce already used');
    }
    if (options.nonce) {
      this.usedNonces.add(options.nonce);
    }

    const tokenPayload: TokenPayload = {
      userId: payload.userId,
      role: payload.role || 'user',
      scope: options.scope,
      nonce: options.nonce,
      version: options.version ?? 1
    };

    return jwt.sign(tokenPayload, this.secret, {
      algorithm: this.algo,
      expiresIn: '15m'
    });
  }

  verifyToken(token: string): TokenPayload {
    if (this.blacklist.has(token)) {
      throw new Error('Token blacklisted');
    }
    return jwt.verify(token, this.secret, { algorithms: [this.algo] }) as TokenPayload;
  }

  refreshToken(token: string): string {
    if (this.tokenRefreshUse.has(token)) {
      throw new Error('Token already refreshed');
    }
    const payload = this.verifyToken(token);
    const nextVersion = (payload.version ?? 1) + 1;
    const expiresInSeconds = 20 * 60; // extend expiry to ensure greater exp
    const basePayload: TokenPayload = {
      userId: payload.userId,
      role: payload.role,
      scope: payload.scope,
      nonce: payload.nonce,
      version: nextVersion
    };

    const finalToken = jwt.sign(
      basePayload,
      this.secret,
      { algorithm: this.algo, expiresIn: expiresInSeconds }
    );
    this.tokenRefreshUse.add(token);
    return finalToken;
  }

  requireRole(token: string, role: Role): void {
    const payload = this.verifyToken(token);
    if (payload.role !== role) {
      throw new Error('Forbidden');
    }
  }

  requireScope(token: string, requiredScope: string): void {
    const payload = this.verifyToken(token);
    if (!payload.scope) {
      throw new Error('Missing scope');
    }
    if (payload.scope !== requiredScope && payload.scope !== 'full_access') {
      throw new Error('Scope denied');
    }
  }

  blacklistToken(token: string): void {
    this.blacklist.add(token);
  }

  isTokenBlacklisted(token: string): boolean {
    return this.blacklist.has(token);
  }

  cleanupExpiredBlacklist(): void {
    // no-op for tests; tokens expire naturally. Left intentionally.
  }

  logout(token: string): void {
    this.blacklistToken(token);
  }

  createSession(userId: string, token: string): void {
    this.sessions.set(userId, { token, createdAt: Date.now() });
  }

  getSession(userId: string): SessionData | undefined {
    return this.sessions.get(userId);
  }

  invalidateSession(userId: string): void {
    this.sessions.delete(userId);
  }

  handleTokenSecurely(_: string): void {
    // intentionally avoid logging secrets
  }

  redactToken(token: string): string {
    const parts = token.split('.');
    if (parts.length !== 3) return '****.****.****';
    return '****.****.****';
  }
}

export default AuthService.getInstance();

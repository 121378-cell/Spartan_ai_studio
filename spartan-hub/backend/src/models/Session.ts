import { userDb } from '../services/databaseServiceFactory';
import { v4 as uuidv4 } from 'uuid';
import { UserModel } from './User';

export interface Session {
  id: string;
  userId: string;
  token: string;
  userAgent: string;
  ipAddress: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
}

export class SessionModel {
  static async create(sessionData: Omit<Session, 'id' | 'createdAt' | 'lastActivityAt'> & { id?: string }): Promise<Session> {
    const user = await UserModel.findById(sessionData.userId);
    if (!user) {
      throw new Error(`Cannot create session: User with ID ${sessionData.userId} does not exist`);
    }

    const id = sessionData.id || uuidv4();
    const now = new Date();

    const session = {
      id,
      ...sessionData,
      createdAt: now,
      lastActivityAt: now
    };

    // Store session in database
    await userDb.createSession(session);
    return session;
  }

  static async findById(id: string): Promise<Session | null> {
    return userDb.findSessionById(id);
  }

  static async findByToken(token: string): Promise<Session | null> {
    return userDb.findSessionByToken(token);
  }

  static async findByUserId(userId: string): Promise<Session[]> {
    return userDb.findSessionsByUserId(userId);
  }

  static async updateLastActivity(sessionId: string): Promise<void> {
    await userDb.updateSessionLastActivity(sessionId);
  }

  static async update(sessionData: Session): Promise<void> {
    if (userDb.updateSession) {
      await userDb.updateSession(sessionData);
    }
  }

  static async deactivate(sessionId: string): Promise<void> {
    await userDb.deactivateSession(sessionId);
  }

  static async delete(sessionId: string): Promise<void> {
    if (userDb.deleteSession) {
      await userDb.deleteSession(sessionId);
    }
  }

  static async deactivateAllUserSessions(userId: string): Promise<void> {
    await userDb.deactivateAllUserSessions(userId);
  }

  static async cleanupExpiredSessions(): Promise<void> {
    await userDb.cleanupExpiredSessions();
  }

  static async clear(): Promise<void> {
    if (userDb.clearSessions) {
      await userDb.clearSessions();
    }
  }
}

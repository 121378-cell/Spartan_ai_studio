import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';

// Scopes required for Google Fit
const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.nutrition.read',
  'https://www.googleapis.com/auth/fitness.sleep.read'
];

export class GoogleFitService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
     * Generates the URL for the user to consent to permissions
     */
  getAuthUrl(userId: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required to get refresh token
      scope: SCOPES,
      state: userId, // Pass userId as state to identify user in callback
      prompt: 'consent' // Force consent to ensure we get a refresh token
    });
  }

  /**
     * Exchanges authorization code for tokens and saves them to user profile
     */
  async handleCallback(code: string, userId: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      // Save tokens to user
      await UserModel.update(userId, {
        googleFit: {
          accessToken: tokens.access_token || undefined,
          refreshToken: tokens.refresh_token || undefined,
          expiryDate: tokens.expiry_date || undefined
        }
      });

      logger.info(`Google Fit tokens saved for user ${userId}`);
    } catch (error) {
      logger.error('Error getting Google Fit tokens:', { metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
     * Fetches step count for a specific time range
     */
  async getDailySteps(userId: string, startTimeMillis: number, endTimeMillis: number): Promise<number> {
    const auth = await this.getUserAuth(userId);
    if (!auth) return 0;

    const fitness = google.fitness({ version: 'v1', auth });

    try {
      const response = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{
            dataTypeName: 'com.google.step_count.delta',
            dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
          }],
          bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
          startTimeMillis,
          endTimeMillis
        }
      } as any);

      const bucket = response.data.bucket?.[0];
      const point = bucket?.dataset?.[0]?.point?.[0];
      const steps = point?.value?.[0]?.intVal || 0;

      return steps;
    } catch (error) {
      logger.error(`Error fetching steps for user ${userId}:`, { metadata: { error: String(error) } });
      return 0;
    }
  }

  /**
     * Revokes Google Fit authorization for a user and cleans up profile data
     */
  async disconnect(userId: string): Promise<void> {
    try {
      const user = await UserModel.findById(userId);
      if (!user || !user.googleFit) {
        logger.warn(`User ${userId} not connected to Google Fit`);
        return;
      }

      // Attempt to revoke the refresh token on Google's servers
      if (user.googleFit.refreshToken) {
        try {
          await this.oauth2Client.revokeCredentials();
          logger.info(`Successfully revoked Google Fit tokens for user ${userId}`);
        } catch (revokeError) {
          // Token might already be revoked or invalid, log but continue with cleanup
          logger.warn(`Could not revoke token for user ${userId}`, { 
            metadata: { error: String(revokeError) } 
          });
        }
      }

      // Clear user profile data regardless of revocation success
      await UserModel.update(userId, {
        googleFit: undefined
      });

      logger.info(`Google Fit profile cleaned for user ${userId}`);
    } catch (error) {
      logger.error('Error disconnecting Google Fit:', { metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
     * Checks if a user is connected to Google Fit
     */
  async isConnected(userId: string): Promise<boolean> {
    try {
      const user = await UserModel.findById(userId);
      return Boolean(user && user.googleFit && user.googleFit.accessToken && user.googleFit.refreshToken);
    } catch (error) {
      logger.error('Error checking Google Fit connection:', { metadata: { error: String(error) } });
      return false;
    }
  }

  /**
     * Helper to get an authenticated client for a user, handling token refresh
     */
  private async getUserAuth(userId: string): Promise<OAuth2Client | null> {
    const user = await UserModel.findById(userId);
    if (!user || !user.googleFit || !user.googleFit.refreshToken) {
      logger.warn(`User ${userId} not connected to Google Fit`);
      return null;
    }

    // Create a new client instance to avoid side effects
    const userClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    userClient.setCredentials({
      access_token: user.googleFit.accessToken,
      refresh_token: user.googleFit.refreshToken,
      expiry_date: user.googleFit.expiryDate
    });

    // Check if token needs refresh handled automatically by library on requests usually, 
    // but explicit refresh ensures validity before making calls.
    // google-auth-library handles it if refresh_token is present.

    return userClient;
  }
}

export const googleFitService = new GoogleFitService();

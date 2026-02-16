/**
 * Daily Briefing Service
 * 
 * Generates personalized morning video briefings for users.
 */

import { logger } from '../utils/logger';
import { BiometricDataType } from '../types/biometric';

export interface DailyBriefingData {
  userId: string;
  date: Date;
  previousDay: {
    workoutsCompleted: number;
    caloriesBurned: number;
    steps: number;
    sleepHours: number;
    recoveryScore: number;
  };
  currentMetrics: {
    readiness: number;
    hrv: number;
    restingHeartRate: number;
    stressLevel: number;
  };
  recommendations: {
    workoutType: string;
    intensity: 'low' | 'moderate' | 'high';
    duration: number;
    focus: string;
  };
  alerts: {
    injuryRisk?: boolean;
    overtraining?: boolean;
    poorSleep?: boolean;
  };
}

export interface BriefingVideo {
  userId: string;
  date: Date;
  script: string;
  audioUrl: string;
  videoUrl: string;
  duration: number;
  expiresAt: Date;
}

export class DailyBriefingService {
  private elevenLabsApiKey: string;

  constructor() {
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || '';
  }

  /**
   * Generate daily briefing for a user
   */
  async generateBriefing(userId: string): Promise<BriefingVideo> {
    try {
      logger.info('Generating daily briefing', { context: 'daily-briefing', userId });

      // 1. Gather user data
      const data = await this.gatherUserData(userId);

      // 2. Generate script locally (OpenAI link removed)
      const script = await this.generateScript(data);

      // 3. Generate voice with ElevenLabs
      const audioBuffer = await this.generateVoice(script, userId);

      // 4. Generate video (avatar + audio)
      const videoUrl = await this.generateVideo(script, audioBuffer, userId);

      // 5. Save and return briefing
      const briefing: BriefingVideo = {
        userId,
        date: new Date(),
        script,
        audioUrl: `https://storage.spartan-hub.com/briefings/${userId}/audio-${Date.now()}.mp3`,
        videoUrl,
        duration: this.estimateDuration(script),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      await this.saveBriefing(briefing);

      logger.info('Daily briefing generated successfully', { 
        context: 'daily-briefing', 
        userId,
        duration: briefing.duration 
      });

      return briefing;
    } catch (error) {
      logger.error('Failed to generate daily briefing', {
        context: 'daily-briefing',
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Gather all necessary user data for briefing
   */
  private async gatherUserData(userId: string): Promise<DailyBriefingData> {
    // Get yesterday's data
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // This would query the database in production
    const data: DailyBriefingData = {
      userId,
      date: new Date(),
      previousDay: {
        workoutsCompleted: 1,
        caloriesBurned: 450,
        steps: 8500,
        sleepHours: 7.5,
        recoveryScore: 78,
      },
      currentMetrics: {
        readiness: 82,
        hrv: 65,
        restingHeartRate: 58,
        stressLevel: 3, // 1-10
      },
      recommendations: {
        workoutType: 'Strength Training',
        intensity: 'moderate',
        duration: 45,
        focus: 'Lower body - squats and deadlifts',
      },
      alerts: {
        injuryRisk: false,
        overtraining: false,
        poorSleep: false,
      },
    };

    // Check for alerts
    if (data.currentMetrics.readiness < 60) {
      data.alerts.overtraining = true;
    }
    if (data.currentMetrics.hrv < 50) {
      data.alerts.injuryRisk = true;
    }
    if (data.previousDay.sleepHours < 6) {
      data.alerts.poorSleep = true;
    }

    return data;
  }

  /**
   * Generate briefing script locally
   */
  private async generateScript(data: DailyBriefingData): Promise<string> {
    // OpenAI integration removed. Using rule-based local generator.
    return this.getDefaultScript(data);
  }

  /**
   * Generate voice using ElevenLabs API
   */
  private async generateVoice(script: string, userId: string): Promise<Buffer> {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text: script,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      logger.error('Failed to generate voice', {
        context: 'daily-briefing',
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate video with avatar and audio
   * Using D-ID or similar API
   */
  private async generateVideo(script: string, audioBuffer: Buffer, userId: string): Promise<string> {
    // In production, this would call D-ID API or similar
    // For now, return a placeholder URL
    const timestamp = Date.now();
    return `https://storage.spartan-hub.com/briefings/${userId}/video-${timestamp}.mp4`;
  }

  /**
   * Save briefing to database
   */
  private async saveBriefing(briefing: BriefingVideo): Promise<void> {
    // In production, save to database
    logger.info('Briefing saved', {
      context: 'daily-briefing',
      userId: briefing.userId,
      metadata: { date: briefing.date },
    });
  }

  /**
   * Get default script if GPT-4 fails
   */
  private getDefaultScript(data: DailyBriefingData): string {
    return `Good morning, Spartan! Yesterday you crushed it with ${data.previousDay.workoutsCompleted} workouts and ${data.previousDay.steps} steps. Your readiness is at ${data.currentMetrics.readiness}%, so today we're going ${data.recommendations.intensity}. Target: ${data.recommendations.duration} minutes of ${data.recommendations.workoutType}, focusing on ${data.recommendations.focus}. Let's make today count!`;
  }

  /**
   * Estimate script duration
   */
  private estimateDuration(script: string): number {
    // Average speaking rate: 150 words per minute
    const wordCount = script.split(' ').length;
    return Math.ceil(wordCount / 150 * 60); // seconds
  }

  /**
   * Schedule daily briefings for all users
   */
  async scheduleDailyBriefings(): Promise<void> {
    // This would run at 6 AM daily via cron job
    logger.info('Scheduling daily briefings', { context: 'daily-briefing' });

    // Get all active users
    // const users = await this.getActiveUsers();

    // Generate briefings in parallel
    // await Promise.all(users.map(user => this.generateBriefing(user.id)));
  }

  /**
   * Get today's briefing for a user
   */
  async getTodayBriefing(userId: string): Promise<BriefingVideo | null> {
    logger.info('Fetching today\'s briefing', { context: 'daily-briefing', userId });

    // In production, query database for today's briefing
    // For now, return null or generate one
    return null;
  }

  /**
   * Mark briefing as watched
   */
  async markAsWatched(briefingId: string, userId: string): Promise<void> {
    logger.info('Marking briefing as watched', {
      context: 'daily-briefing',
      userId,
      metadata: { briefingId },
    });

    // In production, update database
  }

  /**
   * Get briefing history for a user
   */
  async getBriefingHistory(userId: string, limit: number = 30): Promise<BriefingVideo[]> {
    logger.info('Fetching briefing history', {
      context: 'daily-briefing',
      userId,
      metadata: { limit },
    });

    // In production, query database
    return [];
  }

  /**
   * Regenerate today's briefing
   */
  async regenerateBriefing(userId: string): Promise<BriefingVideo> {
    logger.info('Regenerating briefing', { context: 'daily-briefing', userId });

    // Delete existing briefing if any
    // await this.deleteTodayBriefing(userId);

    // Generate new briefing
    return this.generateBriefing(userId);
  }
}

// Singleton instance
export const dailyBriefingService = new DailyBriefingService();

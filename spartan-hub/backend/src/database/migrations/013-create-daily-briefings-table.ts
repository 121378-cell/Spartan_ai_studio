/**
 * Migration: Create Daily Briefings Table
 * 
 * Stores personalized morning video briefings for users
 */

import { Database } from 'sqlite3';

export const up = async (db: Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS daily_briefings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date DATETIME NOT NULL,
        script TEXT NOT NULL,
        audio_url TEXT NOT NULL,
        video_url TEXT NOT NULL,
        duration INTEGER NOT NULL,
        watched BOOLEAN DEFAULT FALSE,
        watched_at DATETIME,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        // Create index for faster queries
        db.run(`
          CREATE INDEX IF NOT EXISTS idx_daily_briefings_user_date 
          ON daily_briefings(user_id, date)
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  });
};

export const down = async (db: Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('DROP TABLE IF EXISTS daily_briefings', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
